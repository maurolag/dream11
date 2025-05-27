from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Player Model
class Player(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    position: str  # GK, CB, LB, RB, CM, DM, AM, LW, RW, ST
    club: str
    country: str
    rating: int  # 1-100
    image_url: str
    achievements: List[str] = []
    era: str  # "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"
    description: str = ""

class PlayerCreate(BaseModel):
    name: str
    position: str
    club: str
    country: str
    rating: int
    image_url: str
    achievements: List[str] = []
    era: str
    description: str = ""

# Formation Model
class FormationPlayer(BaseModel):
    player_id: str
    position_slot: str  # "GK", "CB1", "CB2", "LB", "RB", "CM1", "CM2", "CM3", "LW", "RW", "ST"

class Formation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_name: str
    formation_name: str  # "4-3-3", "4-4-2", etc.
    theme: str
    players: List[FormationPlayer]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    votes: int = 0

class FormationCreate(BaseModel):
    user_name: str
    formation_name: str
    theme: str
    players: List[FormationPlayer]

# Theme Model
class Theme(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    filter_criteria: dict  # {"club": "Boca Juniors"} or {"era": "1990s"} etc.
    is_daily: bool = True
    date: datetime = Field(default_factory=datetime.utcnow)

class ThemeCreate(BaseModel):
    name: str
    description: str
    filter_criteria: dict
    is_daily: bool = True

# Basic routes
@api_router.get("/")
async def root():
    return {"message": "Football Team Builder API"}

# Player routes
@api_router.post("/players", response_model=Player)
async def create_player(player: PlayerCreate):
    player_dict = player.dict()
    player_obj = Player(**player_dict)
    await db.players.insert_one(player_obj.dict())
    return player_obj

@api_router.get("/players", response_model=List[Player])
async def get_players(position: Optional[str] = None, club: Optional[str] = None, era: Optional[str] = None):
    filter_dict = {}
    if position:
        filter_dict["position"] = position
    if club:
        filter_dict["club"] = club
    if era:
        filter_dict["era"] = era
    
    players = await db.players.find(filter_dict).to_list(1000)
    return [Player(**player) for player in players]

@api_router.get("/players/{player_id}", response_model=Player)
async def get_player(player_id: str):
    player = await db.players.find_one({"id": player_id})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return Player(**player)

# Formation routes
@api_router.post("/formations", response_model=Formation)
async def create_formation(formation: FormationCreate):
    formation_dict = formation.dict()
    formation_obj = Formation(**formation_dict)
    await db.formations.insert_one(formation_obj.dict())
    return formation_obj

@api_router.get("/formations", response_model=List[Formation])
async def get_formations(theme: Optional[str] = None):
    filter_dict = {}
    if theme:
        filter_dict["theme"] = theme
    
    formations = await db.formations.find(filter_dict).sort("votes", -1).to_list(100)
    return [Formation(**formation) for formation in formations]

@api_router.put("/formations/{formation_id}/vote")
async def vote_formation(formation_id: str):
    result = await db.formations.update_one(
        {"id": formation_id},
        {"$inc": {"votes": 1}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Formation not found")
    return {"message": "Vote recorded"}

# Theme routes
@api_router.post("/themes", response_model=Theme)
async def create_theme(theme: ThemeCreate):
    theme_dict = theme.dict()
    theme_obj = Theme(**theme_dict)
    await db.themes.insert_one(theme_obj.dict())
    return theme_obj

@api_router.get("/themes", response_model=List[Theme])
async def get_themes():
    themes = await db.themes.find().sort("date", -1).to_list(100)
    return [Theme(**theme) for theme in themes]

@api_router.get("/themes/daily", response_model=Theme)
async def get_daily_theme():
    today = datetime.utcnow().date()
    theme = await db.themes.find_one({
        "is_daily": True,
        "date": {
            "$gte": datetime.combine(today, datetime.min.time()),
            "$lt": datetime.combine(today, datetime.max.time())
        }
    })
    if not theme:
        # If no daily theme, create a default one
        default_theme = Theme(
            name="Leyendas del Fútbol Mundial",
            description="Arma tu once ideal con las más grandes leyendas de la historia del fútbol",
            filter_criteria={},
            is_daily=True
        )
        await db.themes.insert_one(default_theme.dict())
        return default_theme
    return Theme(**theme)

# Initialize sample data
@api_router.post("/init-data")
async def init_sample_data():
    # Check if data already exists
    existing_players = await db.players.count_documents({})
    if existing_players > 0:
        return {"message": "Sample data already exists"}
    
    # Sample players with the images we got
    sample_players = [
        {
            "name": "Lionel Messi",
            "position": "RW",
            "club": "PSG",
            "country": "Argentina",
            "rating": 95,
            "image_url": "https://images.pexels.com/photos/32276071/pexels-photo-32276071/free-photo-of-soccer-player-on-field-ready-to-kick-ball.jpeg",
            "achievements": ["8x Ballon d'Or", "World Cup 2022", "4x Champions League"],
            "era": "2000s",
            "description": "Considered by many as the greatest footballer of all time"
        },
        {
            "name": "Cristiano Ronaldo",
            "position": "ST",
            "club": "Al-Nassr",
            "country": "Portugal",
            "rating": 94,
            "image_url": "https://images.pexels.com/photos/32190745/pexels-photo-32190745/free-photo-of-professional-soccer-player-celebrating-goal.jpeg",
            "achievements": ["5x Ballon d'Or", "5x Champions League", "Euro 2016"],
            "era": "2000s",
            "description": "One of the greatest goal scorers in football history"
        },
        {
            "name": "Diego Maradona",
            "position": "AM",
            "club": "Napoli",
            "country": "Argentina",
            "rating": 96,
            "image_url": "https://images.pexels.com/photos/32190729/pexels-photo-32190729/free-photo-of-soccer-player-prepares-for-throw-in-on-field.jpeg",
            "achievements": ["World Cup 1986", "2x Serie A with Napoli"],
            "era": "1980s",
            "description": "The legendary Hand of God and Goal of the Century"
        },
        {
            "name": "Pelé",
            "position": "ST",
            "club": "Santos",
            "country": "Brazil",
            "rating": 96,
            "image_url": "https://images.unsplash.com/flagged/photo-1568105631375-d992b82a905b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwxfHxmb290YmFsbCUyMHBsYXllcnN8ZW58MHx8fHdoaXRlfDE3NDgzNjYxOTF8MA&ixlib=rb-4.1.0&q=85",
            "achievements": ["3x World Cup", "1000+ goals"],
            "era": "1960s",
            "description": "The King of Football"
        },
        {
            "name": "Ronaldinho",
            "position": "AM",
            "club": "Barcelona",
            "country": "Brazil",
            "rating": 92,
            "image_url": "https://images.pexels.com/photos/28893176/pexels-photo-28893176/free-photo-of-professional-soccer-player-mid-action-on-field.jpeg",
            "achievements": ["Ballon d'Or 2005", "Champions League 2006", "World Cup 2002"],
            "era": "2000s",
            "description": "The magician with the ball"
        },
        {
            "name": "Paolo Maldini",
            "position": "LB",
            "club": "AC Milan",
            "country": "Italy",
            "rating": 93,
            "image_url": "https://images.pexels.com/photos/31543184/pexels-photo-31543184/free-photo-of-soccer-player-celebrating-goal-on-field.jpeg",
            "achievements": ["8x Champions League", "7x Serie A"],
            "era": "1990s",
            "description": "One of the greatest defenders of all time"
        },
        {
            "name": "Franco Baresi",
            "position": "CB",
            "club": "AC Milan",
            "country": "Italy",
            "rating": 92,
            "image_url": "https://images.pexels.com/photos/17583386/pexels-photo-17583386/free-photo-of-portrait-of-a-football-player.jpeg",
            "achievements": ["3x Champions League", "6x Serie A"],
            "era": "1980s",
            "description": "Legendary sweeper and captain"
        },
        {
            "name": "Gianluigi Buffon",
            "position": "GK",
            "club": "Juventus",
            "country": "Italy",
            "rating": 91,
            "image_url": "https://images.pexels.com/photos/32157745/pexels-photo-32157745/free-photo-of-young-goalkeeper-preparing-for-action-on-field.jpeg",
            "achievements": ["World Cup 2006", "10x Serie A"],
            "era": "2000s",
            "description": "One of the greatest goalkeepers ever"
        },
        {
            "name": "Zinedine Zidane",
            "position": "CM",
            "club": "Real Madrid",
            "country": "France",
            "rating": 94,
            "image_url": "https://images.pexels.com/photos/20814951/pexels-photo-20814951/free-photo-of-a-football-player-kicking-the-ball-during-a-match.jpeg",
            "achievements": ["Ballon d'Or 1998", "World Cup 1998", "Euro 2000"],
            "era": "1990s",
            "description": "French maestro with incredible technique"
        },
        {
            "name": "Ronaldo Nazário",
            "position": "ST",
            "club": "Real Madrid",
            "country": "Brazil",
            "rating": 93,
            "image_url": "https://images.pexels.com/photos/32179245/pexels-photo-32179245/free-photo-of-football-player-on-field-during-match.jpeg",
            "achievements": ["2x Ballon d'Or", "2x World Cup"],
            "era": "1990s",
            "description": "The Original Ronaldo, phenomenal striker"
        },
        {
            "name": "Cafu",
            "position": "RB",
            "club": "AC Milan",
            "country": "Brazil",
            "rating": 90,
            "image_url": "https://images.pexels.com/photos/32179174/pexels-photo-32179174/free-photo-of-exciting-football-match-with-dynamic-player-action.jpeg",
            "achievements": ["2x World Cup", "Champions League 2007"],
            "era": "1990s",
            "description": "Legendary Brazilian right-back"
        },
        {
            "name": "Xavi Hernández",
            "position": "CM",
            "club": "Barcelona",
            "country": "Spain",
            "rating": 91,
            "image_url": "https://images.pexels.com/photos/29719236/pexels-photo-29719236/free-photo-of-dramatic-soccer-tackle-in-intense-match.jpeg",
            "achievements": ["World Cup 2010", "Euro 2008, 2012", "4x Champions League"],
            "era": "2000s",
            "description": "Master of passing and ball control"
        },
        {
            "name": "Andrés Iniesta",
            "position": "AM",
            "club": "Barcelona",
            "country": "Spain",
            "rating": 91,
            "image_url": "https://images.pexels.com/photos/16355087/pexels-photo-16355087/free-photo-of-man-playing-soccer.jpeg",
            "achievements": ["World Cup 2010", "Euro 2008, 2012", "4x Champions League"],
            "era": "2000s",
            "description": "Elegant playmaker with perfect technique"
        },
        {
            "name": "Thierry Henry",
            "position": "LW",
            "club": "Arsenal",
            "country": "France",
            "rating": 91,
            "image_url": "https://images.pexels.com/photos/27684711/pexels-photo-27684711/free-photo-of-a-young-man-in-soccer-gear-standing-in-front-of-a-field.jpeg",
            "achievements": ["World Cup 1998", "Euro 2000", "Champions League 2009"],
            "era": "2000s",
            "description": "Arsenal legend and French striker"
        },
        {
            "name": "Luka Modrić",
            "position": "CM",
            "club": "Real Madrid",
            "country": "Croatia",
            "rating": 90,
            "image_url": "https://images.pexels.com/photos/32190747/pexels-photo-32190747/free-photo-of-dramatic-save-in-a-professional-football-match.jpeg",
            "achievements": ["Ballon d'Or 2018", "5x Champions League", "World Cup Final 2018"],
            "era": "2010s",
            "description": "Croatian midfield maestro"
        }
    ]
    
    # Insert sample players
    for player_data in sample_players:
        player = Player(**player_data)
        await db.players.insert_one(player.dict())
    
    # Create sample themes
    sample_themes = [
        {
            "name": "Leyendas del FC Barcelona",
            "description": "Arma tu once ideal con los mejores jugadores en la historia del Barcelona",
            "filter_criteria": {"club": "Barcelona"},
            "is_daily": False
        },
        {
            "name": "Campeones del Mundo",
            "description": "Once ideal con jugadores que han ganado la Copa del Mundo",
            "filter_criteria": {},
            "is_daily": False
        },
        {
            "name": "La Era Dorada Brasileña",
            "description": "Los mejores futbolistas brasileños de todos los tiempos",
            "filter_criteria": {"country": "Brazil"},
            "is_daily": False
        }
    ]
    
    for theme_data in sample_themes:
        theme = Theme(**theme_data)
        await db.themes.insert_one(theme.dict())
    
    return {"message": "Sample data created successfully"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
