
# Chat Application

## Table of Contents
- [Introduction](#introduction)
- [Directory Structure](#directory-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Project](#running-the-project)
- [Frontend](#frontend)
  - [Deployment](#deployment)
  - [Icon and Title](#icon-and-title)
- [Backend](#backend)
  - [Environment Variables](#environment-variables)
  - [API Endpoints](#api-endpoints)
- [Contributing](#contributing)
- [License](#license)

## Introduction
This project is a Chat application consisting of a frontend built with React and a backend built using Node.js and MongoDB. The application allows users to chat between users and agents.

## Directory Structure
The project has the following directory structure:
```
.
├── frontend
│   ├── public
│   ├── src
│   ├── package.json
│   └── ...
├── backend
│   ├── public
│   ├── src
│   ├── index.ts
│   ├── package.json
│   └── ...
└── README.md
```

## Prerequisites
- Node.js (version 14.x or higher)
- npm (version 6.x or higher) or yarn
- MongoDB (local or Atlas)
- Redis

## Installation

1. **Install dependencies for both frontend and backend:**

   - Frontend:
     ```sh
     cd frontend
     npm install
     ```

   - Backend:
     ```sh
     cd ../backend
     npm install
     ```

## Frontend

### Deployment
To deploy the frontend , follow these steps:

1. Set the `baseUrl` of the frontend project. For example, if the base URL is `https://www.alegralabs.com/ANY_FOLDER_NAME`, then the `baseUrl` will be `ANY_FOLDER_NAME`.
2. Add `base: "/ANY_FOLDER_NAME"` in the `vite.config.ts` file and in `./src/config.tsx`, add the basename to the Router tag: `<Router basename='/ANY_FOLDER_NAME'>`.
3. Open the terminal and run `npm run build` to build the app for production, which will create the `dist` folder.
4. Copy the contents of the `dist` folder to the `ANY_FOLDER_NAME` or the desired folder on the server.

### Icon and Title
To update the icon, title, and other metadata of the application, go to the `./src/config.tsx` file in the frontend folder and make the necessary changes.

## Backend

The backend is built using Node.js with Express, Redis, and MongoDB.

### Running the Backend
In the `backend` directory:

1. Open the terminal and run the command `npx tsc`. This will create a `dist` folder containing all the compiled files.
2. Copy the `.env` file to the `dist` folder.
3. Copy the entire backend folder to the server or use `git pull` if the code is updated in GitHub.
4. (Optional) Depending on the server and the type of deployment, run the `NAME.service` file. Note: use Node version `16.20.2`.

### Environment Variables
Create a `.env` file in the `backend` directory and add the following variables:
```
EMAIL_PASSWORD=your-gmail-app-password-for-sending-chat-transcript
EMAIL_ID=your-email-for-sending-chat-transcript
DB=chats
MONGO_URI=your-mongodb-uri
ACCESS_TOKEN_SECRET=your-accesstoken-secret-key
ACCESS_TOKEN_EXPIRY=1h
REFRESH_TOKEN_SECRET=your-refreshtoken-secret-key
REFRESH_TOKEN_EXPIRY=12h
SOCKET_AUTH_CODE=your-secret-code-distinguishing-between-users-and-agents
FILE_URL="your-path-to-the-stored-files"
PORT=5005
```

### API Endpoints
The backend provides the following API endpoints:

- `POST /api/user/login` - User login.
- `POST /api/admin/login` - Agent/Admin login.
- `POST /api/admin/register` - New Agent/Admin registration.
- `GET /api/logout` - User/Admin logout.
- `POST /api/refresh-token` - Refresh access token.
- `POST /api/send-transcript` - Send chat transcript.
- `POST /api/upload` - Upload files.
- `GET /api/logs` - Check console logs of the file.

