# Next-Pkg Project

This project is a monorepo that contains two applications: a backend application (`my-app-back`) and a frontend application (`my-app`). The backend is built using TypeScript and provides an API for the frontend to interact with.

## Project Structure

```
next-pkg
├── my-app-back
│   ├── src
│   │   ├── lib
│   │   │   └── api.ts
│   │   ├── types
│   │   │   └── index.ts
│   │   └── pages
│   │       └── api
│   │           └── trpc.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── my-app
│   ├── trpc
│   │   └── routers
│   │       └── _app.ts
│   ├── src
│   │   └── pages
│   │       └── api
│   │           └── trpc.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── package.json
├── .gitignore
└── README.md
```

## Getting Started

To get started with the project, follow these steps:

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd next-pkg
   ```

2. **Install dependencies**:
   Navigate to both `my-app-back` and `my-app` directories and run:
   ```bash
   npm install
   ```

3. **Run the applications**:
   - For the backend:
     ```bash
     cd my-app-back
     npm run dev
     ```
   - For the frontend:
     ```bash
     cd my-app
     npm run dev
     ```

## Features

- **Backend**:
  - Provides an API for fetching dashboard statistics, users, documents, and AI shorthand records.
  - Uses mock data for simulation during development.

- **Frontend**:
  - Interacts with the backend API to display data and manage user interactions.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.