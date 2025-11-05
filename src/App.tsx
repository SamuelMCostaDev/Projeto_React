import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { Counter } from "./components/Counter";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./layout/Layout";
import Home from "./pages/Home";
import Users from "./pages/Users";
import NotFound from "./pages/NotFound";
import UserDetail from "./pages/UserDetail";
import Signup from "./pages/Signup";
import Protected from "./components/Protected";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";

const router = createBrowserRouter([
  { element: <Layout />, children: [
      { path: "/", element: <Home /> },
      { path: "*", element: <NotFound /> }, 
      { path: "/signup", element: <Signup /> },
      { path: "/login", element: <Login/>},
      {
        element: <ProtectedRoute />, 
        children: [
          { path: "/dashboard", element: <Dashboard /> },
          { path: "/users", element: <Users /> },
          { path: "/users/:id", element: <UserDetail /> },
        ],
      },
  ]},
]);

export default function App() {
  return <RouterProvider router={router} />;
}