# Trailbase

Trailbase is a free, lightweight trek-management workspace. It runs in a modern browser with no install, account, paid service, or build step.

## What it can do

- **Overview:** upcoming departures, booking counts, payments received, outstanding balances, and recent bookings.
- **Treks:** manage itineraries, dates, difficulty, capacity, per-person price, and departure status.
- **Bookings:** connect guests to treks, record guest counts and payments, and track confirmation and balance due.
- **Customers:** keep contact details and emergency contacts together.
- **Guides:** maintain guide contact details, specialties, and availability status.
- **Expenses:** record trek-related and general costs.
- **Reports:** review recorded income, expenses, net, outstanding balances, and recent monthly cash flow.
- **Data portability:** download a JSON backup, restore a backup, or export bookings as CSV.

All amounts are shown in Indian rupees (INR). The app saves records in the browser's local storage on the device where it is opened. Data is not uploaded or shared. Use **Download backup** regularly; clearing browser data or switching devices does not transfer your workspace automatically.

## Run it

Open `index.html` in a recent browser, or serve this folder locally:

```sh
python3 -m http.server 8000
```

Then visit <http://localhost:8000>. The optional Google Fonts connection only affects typography; the app's functionality does not require a build tool or external service.

## Publish with GitHub Pages

1. Create a new GitHub repository and push these files to its `main` branch.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, and save.
4. Open the published Pages URL. Each visitor's data stays in their own browser.

GitHub Pages is a static website host, so it does not provide shared accounts, a server, or synchronized multi-user data. This version is intended for a single browser/device workspace; share a backup file when you need to move the records.

## Data notes

- The first open creates sample records so the dashboard is useful immediately. Delete them or replace them with your own.
- Booking totals are calculated from each trek's current per-person price and the booking's guest count.
- Capacity checks prevent confirmed or pending bookings from exceeding a trek's available spaces.
- Deleting a trek also deletes its bookings and unassigns its expenses. Deleting a customer also deletes that customer's bookings.
- Restoring a backup replaces the current browser data after confirmation.
