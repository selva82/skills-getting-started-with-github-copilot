"""
FastAPI backend tests for the Mergington High School API.

Uses the Arrange-Act-Assert pattern to keep tests readable and maintainable.
"""

import copy

import pytest
from fastapi.testclient import TestClient

from src.app import app, activities

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_activities():
    """Reset the in-memory activity database before each test."""
    original_state = copy.deepcopy(activities)
    yield
    activities.clear()
    activities.update(copy.deepcopy(original_state))


def test_get_activities_returns_all_activities():
    # Arrange
    expected_activity_names = {
        "Chess Club",
        "Programming Class",
        "Gym Class",
        "Basketball Team",
        "Soccer Club",
        "Art Club",
        "Drama Club",
        "Debate Club",
        "Science Club",
    }

    # Act
    response = client.get("/activities")

    # Assert
    assert response.status_code == 200
    returned_activities = response.json()
    assert set(returned_activities.keys()) == expected_activity_names
    assert "participants" in returned_activities["Chess Club"]


def test_signup_for_activity_success():
    # Arrange
    activity_name = "Basketball Team"
    email = "new_student@mergington.edu"
    assert email not in activities[activity_name]["participants"]

    # Act
    response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 200
    assert email in activities[activity_name]["participants"]
    assert response.json() == {"message": f"Signed up {email} for {activity_name}"}


def test_signup_duplicate_returns_400():
    # Arrange
    activity_name = "Chess Club"
    email = activities[activity_name]["participants"][0]

    # Act
    response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 400
    assert "already signed up for this activity" in response.json()["detail"]


def test_signup_for_full_activity_returns_400():
    # Arrange
    activity_name = "Debate Club"
    email = "student_full@mergington.edu"
    activities[activity_name]["participants"] = [
        f"student{i}@mergington.edu" for i in range(activities[activity_name]["max_participants"])
    ]

    # Act
    response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 400
    assert "Activity is full" in response.json()["detail"]


def test_remove_participant_success():
    # Arrange
    activity_name = "Chess Club"
    email = activities[activity_name]["participants"][0]

    # Act
    response = client.delete(
        f"/activities/{activity_name}/participants",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 200
    assert email not in activities[activity_name]["participants"]
    assert response.json() == {"message": f"Unregistered {email} from {activity_name}"}


def test_remove_participant_not_found_returns_404():
    # Arrange
    activity_name = "Basketball Team"
    email = "not_registered@mergington.edu"

    # Act
    response = client.delete(
        f"/activities/{activity_name}/participants",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Participant not found"


def test_remove_participant_from_nonexistent_activity_returns_404():
    # Arrange
    activity_name = "Nonexistent Club"
    email = "student@mergington.edu"

    # Act
    response = client.delete(
        f"/activities/{activity_name}/participants",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"
