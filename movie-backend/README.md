# Movie Backend

## Local MongoDB as source of truth

1. Keep local data in `SOURCE_MONGO_URI` up to date.
2. Run a dry run to validate normalize + sync:

```powershell
$env:SOURCE_MONGO_URI="mongodb://127.0.0.1:27017/The-Movie"
$env:ATLAS_MONGO_URI="mongodb+srv://user:pass@cluster.mongodb.net/The-Movie?retryWrites=true&w=majority"
npm run db:atlas:dry
```

3. Push local data to MongoDB Atlas:

```powershell
npm run db:atlas:push
```

## Notes

- `db:atlas:push` runs `scripts/sync-data.js` on the source DB first, then mirrors the selected collections to Atlas.
- By default, documents missing from local source are deleted from Atlas so Atlas stays aligned with local data.
- Use `--drop-target` if you want each target collection recreated from source before import.
- After first push, set your deploy environment `MONGO_URI` on Render/Vercel to the same Atlas URI.
