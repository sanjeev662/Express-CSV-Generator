# Express CSV Generator

This Express.js application fetches data from multiple APIs, combines them, and generates a CSV file.

## Features

- Fetches data from three different JSONPlaceholder API endpoints
- Combines data based on ID matching
- Generates a CSV file with name, title, and body columns
- Implements error handling for API requests and file operations

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

## Usage

Make a GET request to `/generate-csv` endpoint:

```bash
curl http://localhost:3000/generate-csv
```

The response will include the path to the generated CSV file.

## API Endpoints Used

- Users: https://jsonplaceholder.typicode.com/users
- Posts: https://jsonplaceholder.typicode.com/posts
- Comments: https://jsonplaceholder.typicode.com/comments

## Error Handling

The application includes comprehensive error handling for:
- API request failures
- File system operations
- Data processing errors

## Output

The generated CSV files are stored in the `output` directory with timestamps in their filenames.