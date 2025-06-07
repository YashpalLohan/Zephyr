# Blog Website

A full-stack blog website built with Node.js, Express, and MongoDB.

## Features

- User authentication (signup/login)
- Create, read, update, and delete blog posts
- User profiles
- Responsive design

## Tech Stack

- Backend: Node.js, Express.js
- Database: MongoDB
- Frontend: EJS templates
- Authentication: Custom authentication system
- Styling: CSS

## Getting Started

1. Clone the repository:
```bash
git clone <your-repository-url>
cd blog-website
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your environment variables:
```
MONGODB_URI=your_mongodb_connection_string
PORT=3000
```

4. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Project Structure

- `models/` - Database models
- `routes/` - Express routes
- `views/` - EJS templates
- `public/` - Static assets (CSS, images)
- `app.js` - Main application file

## License

MIT 