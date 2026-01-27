# My App

This project is a full-stack application built with Next.js and tRPC, featuring a backend and a frontend. The backend handles API requests and serves mock data, while the frontend consumes this API to display information.

## Project Structure

- **my-app-back**: Contains the backend application.
  - **src/lib/api.ts**: Exports an API object with methods for fetching dashboard statistics, users, documents, and AI shorthand records using mock data.
  - **src/types/index.ts**: Defines TypeScript types used throughout the application.
  - **src/pages/api/trpc.ts**: Sets up the tRPC API routes for the backend.
  - **package.json**: Configuration for the backend application.
  - **tsconfig.json**: TypeScript configuration for the backend.
  - **README.md**: Documentation for the backend application.

- **my-app**: Contains the frontend application.
  - **trpc/routers/_app.ts**: Defines the main router for the tRPC API.
  - **src/pages/api/trpc.ts**: Sets up the tRPC API routes for the frontend.
  - **package.json**: Configuration for the frontend application.
  - **tsconfig.json**: TypeScript configuration for the frontend.
  - **README.md**: Documentation for the frontend application.

- **Root Level**:
  - **.gitignore**: Specifies files and directories to be ignored by Git.
  - **package.json**: Configuration for the overall project.
  - **README.md**: Documentation for the entire project.

## Getting Started

To get started with this project, follow these steps:

1. Clone the repository:
   ```
   git clone <repository-url>
   ```

2. Navigate to the backend directory and install dependencies:
   ```
   cd my-app-back
   npm install
   ```

3. Navigate to the frontend directory and install dependencies:
   ```
   cd ../my-app
   npm install
   ```

4. Start the backend server:
   ```
   cd ../my-app-back
   npm run dev
   ```

5. Start the frontend application:
   ```
   cd ../my-app
   npm run dev
   ```

## Usage

Once both the backend and frontend servers are running, you can access the application in your browser at `http://localhost:3000`.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.