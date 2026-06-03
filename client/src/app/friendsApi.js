const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function getFriendsRequest(token) {
  const response = await fetch(`${API_URL}/friends`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to get friends');
  }
  return response.json();
}

export async function sendFriendRequest(token, username) {
  const response = await fetch(`${API_URL}/friends/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ username }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to send friend request');
  }
  return response.json();
}

export async function acceptFriendRequest(token, username) {
  const response = await fetch(`${API_URL}/friends/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ username }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to accept friend request');
  }
  return response.json();
}

export async function rejectFriendRequest(token, username) {
  const response = await fetch(`${API_URL}/friends/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ username }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to reject friend request');
  }
  return response.json();
}

export async function removeFriendRequest(token, username) {
  const response = await fetch(`${API_URL}/friends/remove`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ username }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to remove friend');
  }
  return response.json();
}
