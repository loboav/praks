# Graph Visualization App

## Overview
This project is a client-server application designed for visualizing and interacting with directed graphs. It consists of a backend built with .NET and a frontend developed using TypeScript and React.

## Technologies Used
- **Backend**: .NET Core, PostgreSQL
- **Frontend**: React, TypeScript, Vis Network / D3.js / Sigma.js / Cytoscape.js / React Flow
- **Containerization**: Docker

## Project Structure
```
graph-visualization-app
├── backend
│   ├── src
│   ├── appsettings.json
│   ├── Dockerfile
│   └── README.md
├── frontend
│   ├── public
│   ├── src
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── README.md
├── db
│   ├── init.sql
│   └── README.md
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites
- .NET SDK
- Node.js and npm
- PostgreSQL
- Docker (optional)

### Installation

1. **Clone the repository**
   ```
   git clone <repository-url>
   cd graph-visualization-app
   ```

2. **Backend Setup**
   - Navigate to the `backend` directory.
   - Restore the dependencies and build the project:
     ```
     dotnet restore
     dotnet build
     ```
   - Configure the `appsettings.json` file with your PostgreSQL connection details.

3. **Frontend Setup**
   - Navigate to the `frontend` directory.
   - Install the dependencies:
     ```
     npm install
     ```

### Running the Application

- **Using Docker**
  - You can run the entire application using Docker Compose:
    ```
    docker-compose up
    ```

- **Without Docker**
  - Start the backend server:
    ```
    dotnet run
    ```
  - Start the frontend application:
    ```
    npm start
    ```

### Usage
- Access the frontend application at `http://localhost:3000`.
- The backend API can be accessed at `http://localhost:5000/api/graph`.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License.