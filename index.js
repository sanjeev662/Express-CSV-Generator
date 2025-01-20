const express = require('express');
const axios = require('axios');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

app.use(express.json());

// Helper function to fetch data from an API with retries
async function fetchWithRetry(endpoint, retries = 0) {
  try {
    const response = await axios.get(endpoint.url);
    return response.data;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      await delay(RETRY_DELAY);
      return fetchWithRetry(endpoint, retries + 1);
    }
    throw new Error(`Failed to fetch ${endpoint.name} after ${MAX_RETRIES} attempts: ${error.message}`);
  }
}

app.get('/generate-csv', async (req, res) => {
  try {
    const apiEndpoints = [
      { url: 'https://jsonplaceholder.typicode.com/users', name: 'users' },
      { url: 'https://jsonplaceholder.typicode.com/posts', name: 'posts' },
      { url: 'https://jsonplaceholder.typicode.com/comments', name: 'comments' }
    ];

    const responses = await Promise.all(
      apiEndpoints.map(endpoint => fetchWithRetry(endpoint))
    );

    const [users, posts, comments] = responses;

    if (!users?.length || !posts?.length || !comments?.length) {
      throw new Error('Invalid or empty response received from one or more APIs');
    }

    const usersMap = new Map(users.map(user => [user.id, user.name]));
    const postsMap = new Map(posts.map(post => [post.id, post.title]));
    const commentsMap = new Map(comments.map(comment => [comment.id, comment.body]));

    const maxId = Math.max(
      ...usersMap.keys(),
      ...postsMap.keys(),
      ...commentsMap.keys()
    );

    // Prepare data for CSV
    const records = Array.from({ length: maxId }, (_, index) => {
      const id = index + 1;
      const record = {
        name: usersMap.get(id) || 'N/A',
        title: postsMap.get(id) || 'N/A',
        body: commentsMap.get(id) || 'N/A'
      };
      return Object.fromEntries(
        Object.entries(record).map(([key, value]) => [
          key,
          String(value)
            .replace(/[\r\n]+/g, ' ')
            .replace(/^[=+@-]/g, '\'$&')
            .trim()
        ])
      );
    });

    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const csvFilePath = path.join(outputDir, `data-${timestamp}.csv`);

    try {
      const csvWriter = createCsvWriter({
        path: csvFilePath,
        header: [
          { id: 'name', title: 'Name' },
          { id: 'title', title: 'Title' },
          { id: 'body', title: 'Body' }
        ]
      });

      await csvWriter.writeRecords(records);

      if (!fs.existsSync(csvFilePath)) {
        throw new Error('CSV file creation failed');
      }

      // Send success response
      res.json({
        success: true,
        message: 'CSV file generated successfully',
        filePath: csvFilePath,
        recordCount: records.length,
        timestamp: timestamp
      });

    } catch (fileError) {
      throw new Error(`CSV file operation failed: ${fileError.message}`);
    }

  } catch (error) {
    console.error('Error in /generate-csv:', error);

    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.message || error.message;

    // Send error response
    res.status(statusCode).json({
      success: false,
      message: 'Failed to generate CSV file',
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});