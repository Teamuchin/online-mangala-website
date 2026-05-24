docker compose up -d

cd client && npm run dev

cd server && npm run dev

docker exec -it mangala_game_db psql -U dev_user -d mangala_game_db
