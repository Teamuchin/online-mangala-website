docker compose up -d

cd client
npm run dev

cd server
npm run dev

psql
docker exec -it mangala_game_db psql -U dev_user -d mangala_game_db
