import requests
import json
import unittest
import os
import time
from datetime import datetime

# Resolve backend URL from environment or frontend/.env
env_path = os.path.join(os.path.dirname(__file__), "frontend/.env")
BACKEND_URL = os.getenv("BACKEND_URL")
if not BACKEND_URL:
    try:
        with open(env_path, "r") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BACKEND_URL = line.strip().split("=", 1)[1].strip().strip("\"").strip("'")
                    break
    except FileNotFoundError:
        # Fallback to localhost if the env file is missing
        BACKEND_URL = "http://localhost:8000"

# Ensure the URL doesn't have quotes
BACKEND_URL = BACKEND_URL.strip('"\'')
API_URL = f"{BACKEND_URL}/api"

class FootballTeamBuilderAPITest(unittest.TestCase):
    
    def setUp(self):
        # Initialize test data
        self.player_data = {
            "name": "Test Player",
            "position": "ST",
            "club": "Test FC",
            "country": "Testland",
            "rating": 85,
            "image_url": "https://example.com/test.jpg",
            "achievements": ["Test Cup 2023"],
            "era": "2020s",
            "description": "Test player for API testing"
        }
        
        self.theme_data = {
            "name": "Test Theme",
            "description": "Theme for testing",
            "filter_criteria": {"club": "Test FC"},
            "is_daily": True
        }
        
        # We'll set this after creating a player
        self.formation_data = None
        
        # Store created resources for cleanup
        self.created_resources = {
            "players": [],
            "formations": [],
            "themes": []
        }
        
        print(f"Using API URL: {API_URL}")
    
    def test_01_init_data(self):
        """Test initializing sample data"""
        print("\n=== Testing Sample Data Initialization ===")
        
        # First, check if we can get players (to see if data already exists)
        response = requests.get(f"{API_URL}/players")
        initial_count = len(response.json()) if response.status_code == 200 else 0
        
        # Initialize sample data
        response = requests.post(f"{API_URL}/init-data")
        self.assertEqual(response.status_code, 200)
        
        # Verify data was created by checking player count
        response = requests.get(f"{API_URL}/players")
        self.assertEqual(response.status_code, 200)
        players = response.json()
        
        if initial_count == 0:
            # If no initial data, we should have the sample players
            self.assertGreaterEqual(len(players), 10)
            print(f"✅ Sample data initialized successfully with {len(players)} players")
        else:
            # If data already existed, the endpoint should have returned a message
            self.assertEqual(len(players), initial_count)
            print("✅ Sample data already existed, endpoint handled correctly")
        
        # Check if themes were created
        response = requests.get(f"{API_URL}/themes")
        self.assertEqual(response.status_code, 200)
        themes = response.json()
        self.assertGreaterEqual(len(themes), 1)
        print(f"✅ Found {len(themes)} themes")
    
    def test_02_player_api(self):
        """Test Player API endpoints"""
        print("\n=== Testing Player API Endpoints ===")
        
        # Create a player
        response = requests.post(f"{API_URL}/players", json=self.player_data)
        self.assertEqual(response.status_code, 200)
        created_player = response.json()
        self.created_resources["players"].append(created_player["id"])
        
        # Verify player was created with correct data
        self.assertEqual(created_player["name"], self.player_data["name"])
        self.assertEqual(created_player["position"], self.player_data["position"])
        self.assertEqual(created_player["club"], self.player_data["club"])
        print(f"✅ Created player: {created_player['name']} (ID: {created_player['id']})")
        
        # Get all players
        response = requests.get(f"{API_URL}/players")
        self.assertEqual(response.status_code, 200)
        players = response.json()
        self.assertGreaterEqual(len(players), 1)
        print(f"✅ Retrieved {len(players)} players")
        
        # Get player by ID
        response = requests.get(f"{API_URL}/players/{created_player['id']}")
        self.assertEqual(response.status_code, 200)
        player = response.json()
        self.assertEqual(player["id"], created_player["id"])
        print(f"✅ Retrieved player by ID: {player['name']}")
        
        # Test filtering by position
        response = requests.get(f"{API_URL}/players?position={self.player_data['position']}")
        self.assertEqual(response.status_code, 200)
        filtered_players = response.json()
        self.assertGreaterEqual(len(filtered_players), 1)
        all_match = all(p["position"] == self.player_data["position"] for p in filtered_players)
        self.assertTrue(all_match)
        print(f"✅ Filtered players by position: {len(filtered_players)} players found")
        
        # Test filtering by club
        response = requests.get(f"{API_URL}/players?club={self.player_data['club']}")
        self.assertEqual(response.status_code, 200)
        filtered_players = response.json()
        self.assertGreaterEqual(len(filtered_players), 1)
        all_match = all(p["club"] == self.player_data["club"] for p in filtered_players)
        self.assertTrue(all_match)
        print(f"✅ Filtered players by club: {len(filtered_players)} players found")
        
        # Test filtering by era
        response = requests.get(f"{API_URL}/players?era={self.player_data['era']}")
        self.assertEqual(response.status_code, 200)
        filtered_players = response.json()
        self.assertGreaterEqual(len(filtered_players), 1)
        all_match = all(p["era"] == self.player_data["era"] for p in filtered_players)
        self.assertTrue(all_match)
        print(f"✅ Filtered players by era: {len(filtered_players)} players found")
        
        # Test non-existent player
        response = requests.get(f"{API_URL}/players/nonexistent-id")
        self.assertEqual(response.status_code, 404)
        print("✅ Correctly handled non-existent player request")
        
        # Save player ID for formation test
        self.test_player_id = created_player["id"]
    
    def test_03_theme_api(self):
        """Test Theme API endpoints"""
        print("\n=== Testing Theme API Endpoints ===")
        
        # Create a theme
        response = requests.post(f"{API_URL}/themes", json=self.theme_data)
        self.assertEqual(response.status_code, 200)
        created_theme = response.json()
        self.created_resources["themes"].append(created_theme["id"])
        
        # Verify theme was created with correct data
        self.assertEqual(created_theme["name"], self.theme_data["name"])
        self.assertEqual(created_theme["description"], self.theme_data["description"])
        self.assertEqual(created_theme["filter_criteria"], self.theme_data["filter_criteria"])
        print(f"✅ Created theme: {created_theme['name']} (ID: {created_theme['id']})")
        
        # Get all themes
        response = requests.get(f"{API_URL}/themes")
        self.assertEqual(response.status_code, 200)
        themes = response.json()
        self.assertGreaterEqual(len(themes), 1)
        print(f"✅ Retrieved {len(themes)} themes")
        
        # Get daily theme
        response = requests.get(f"{API_URL}/themes/daily")
        self.assertEqual(response.status_code, 200)
        daily_theme = response.json()
        self.assertTrue(daily_theme["is_daily"])
        print(f"✅ Retrieved daily theme: {daily_theme['name']}")
        
        # Save theme for formation test
        self.test_theme = created_theme["name"]
    
    def test_04_formation_api(self):
        """Test Formation API endpoints"""
        print("\n=== Testing Formation API Endpoints ===")
        
        # First, make sure we have a player to use
        if not hasattr(self, 'test_player_id'):
            # Create a player if we don't have one
            response = requests.post(f"{API_URL}/players", json=self.player_data)
            self.assertEqual(response.status_code, 200)
            created_player = response.json()
            self.created_resources["players"].append(created_player["id"])
            self.test_player_id = created_player["id"]
        
        # Create formation data
        self.formation_data = {
            "user_name": "Test User",
            "formation_name": "4-3-3",
            "theme": self.test_theme if hasattr(self, 'test_theme') else "Test Theme",
            "players": [
                {
                    "player_id": self.test_player_id,
                    "position_slot": "ST"
                }
            ]
        }
        
        # Create a formation
        response = requests.post(f"{API_URL}/formations", json=self.formation_data)
        self.assertEqual(response.status_code, 200)
        created_formation = response.json()
        self.created_resources["formations"].append(created_formation["id"])
        
        # Verify formation was created with correct data
        self.assertEqual(created_formation["user_name"], self.formation_data["user_name"])
        self.assertEqual(created_formation["formation_name"], self.formation_data["formation_name"])
        self.assertEqual(created_formation["theme"], self.formation_data["theme"])
        self.assertEqual(len(created_formation["players"]), 1)
        print(f"✅ Created formation: {created_formation['formation_name']} by {created_formation['user_name']} (ID: {created_formation['id']})")
        
        # Get all formations
        response = requests.get(f"{API_URL}/formations")
        self.assertEqual(response.status_code, 200)
        formations = response.json()
        self.assertGreaterEqual(len(formations), 1)
        print(f"✅ Retrieved {len(formations)} formations")
        
        # Get formations by theme
        response = requests.get(f"{API_URL}/formations?theme={self.formation_data['theme']}")
        self.assertEqual(response.status_code, 200)
        filtered_formations = response.json()
        self.assertGreaterEqual(len(filtered_formations), 1)
        all_match = all(f["theme"] == self.formation_data["theme"] for f in filtered_formations)
        self.assertTrue(all_match)
        print(f"✅ Filtered formations by theme: {len(filtered_formations)} formations found")
        
        # Test voting
        initial_votes = created_formation["votes"]
        response = requests.put(f"{API_URL}/formations/{created_formation['id']}/vote")
        self.assertEqual(response.status_code, 200)
        
        # Verify vote was recorded
        response = requests.get(f"{API_URL}/formations")
        self.assertEqual(response.status_code, 200)
        formations = response.json()
        updated_formation = next((f for f in formations if f["id"] == created_formation["id"]), None)
        self.assertIsNotNone(updated_formation)
        self.assertEqual(updated_formation["votes"], initial_votes + 1)
        print(f"✅ Voted for formation: votes increased from {initial_votes} to {updated_formation['votes']}")
        
        # Test voting for non-existent formation
        response = requests.put(f"{API_URL}/formations/nonexistent-id/vote")
        self.assertEqual(response.status_code, 404)
        print("✅ Correctly handled voting for non-existent formation")

if __name__ == "__main__":
    # Run the tests
    unittest.main(argv=['first-arg-is-ignored'], exit=False)
