const getFriendshipQuery = `
  SELECT * FROM friendships
  WHERE LEAST(requester_id, addressee_id) = LEAST($1::int, $2::int)
    AND GREATEST(requester_id, addressee_id) = GREATEST($1::int, $2::int);
`;

const insertFriendshipQuery = `
  INSERT INTO friendships (requester_id, addressee_id, status)
  VALUES ($1, $2, 'pending')
  RETURNING *;
`;

const updateFriendshipStatusQuery = `
  UPDATE friendships
  SET status = $3, updated_at = NOW()
  WHERE LEAST(requester_id, addressee_id) = LEAST($1::int, $2::int)
    AND GREATEST(requester_id, addressee_id) = GREATEST($1::int, $2::int)
  RETURNING *;
`;

const deleteFriendshipQuery = `
  DELETE FROM friendships
  WHERE LEAST(requester_id, addressee_id) = LEAST($1::int, $2::int)
    AND GREATEST(requester_id, addressee_id) = GREATEST($1::int, $2::int);
`;

const listUserFriendshipsQuery = `
  SELECT 
    f.id AS friendship_id,
    f.requester_id,
    f.addressee_id,
    f.status,
    f.created_at,
    u.id,
    u.username,
    u.elo,
    u.is_bot,
    u.last_seen
  FROM friendships f
  JOIN users u ON (u.id = f.requester_id OR u.id = f.addressee_id) AND u.id != $1
  WHERE (f.requester_id = $1 OR f.addressee_id = $1)
  ORDER BY f.created_at DESC;
`;

module.exports = {
  getFriendshipQuery,
  insertFriendshipQuery,
  updateFriendshipStatusQuery,
  deleteFriendshipQuery,
  listUserFriendshipsQuery,
};
