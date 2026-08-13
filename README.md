# Azadi Wishes — GitHub Pages + Supabase

This package keeps the original website design and pages and changes only the storage/backend connection.

## Architecture

- **GitHub Pages** — hosts the complete static website.
- **Supabase Edge Function `wish-api`** — creates and retrieves wishes.
- **Supabase PostgreSQL** — stores wish metadata.
- **Supabase private Storage bucket `wish-photos`** — stores compressed photos.
- **No Base64 wish data in share URLs.**
- **No service-role/secret key in the website.**

## Important: the backend is already deployed

You already created and tested the `wish-api` Edge Function. You do **not** need to recreate it.

The frontend calls:

`https://fwigqluewtqcrqvnptua.supabase.co/functions/v1/wish-api`

The browser only sends the Supabase **publishable** key as the `apikey` header. Never put a Supabase secret/service-role key in this repository.

## What changed in the frontend

Only the backend connection was changed:

- old direct Supabase Database/Storage client code removed
- old Base64 fallback removed
- photo is still compressed in the browser by the existing `app.js`
- compressed photo is sent as multipart form data to `wish-api`
- server generates the 10-character ID
- shared wish is loaded through `wish-api`
- photo is displayed from the temporary signed URL returned by the server
- original pages, card themes, canvas rendering, music, confetti, navigation and legal pages are preserved

## GitHub Pages deployment

The site is in the `docs/` folder. GitHub Pages can publish from `/docs` on the `main` branch.

1. Create or open your GitHub repository.
2. Upload the contents of this package so `docs/index.html` exists in the repository.
3. Commit the files.
4. Open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select branch `main` and folder `/docs`.
7. Save.

GitHub will publish the site from that folder.

## Share URL

The JavaScript automatically uses the current GitHub Pages site root, so it works for both:

- `https://USERNAME.github.io/`
- `https://USERNAME.github.io/REPOSITORY/`

A generated link looks like:

`https://USERNAME.github.io/REPOSITORY/?wish=CE3wPZgrhR`

No manual domain configuration is required for the default GitHub Pages URL.

## Testing

After GitHub Pages publishes:

1. Open the site.
2. Go to Create Your Own.
3. Enter a name and message.
4. Optionally choose a photo.
5. Click Create My Wish.
6. Confirm the server returns a 10-character ID.
7. Open the generated `?wish=XXXXXXXXXX` URL in a new private/incognito window.
8. Confirm the same card loads and the photo appears.

## Updating the website later

Edit the files in `docs/`, commit/push them, and GitHub Pages will republish the site from the selected source folder.

If you change the Supabase backend API contract, update `docs/storage.js` to match. Otherwise, normal design/content changes do not require any Supabase changes.
"# azadi-wishes" 
