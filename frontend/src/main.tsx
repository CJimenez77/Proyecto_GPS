import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { FluentProvider, webLightTheme } from '@fluentui/react-components'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Expedientes from './pages/Expedientes'
import Usuarios from './pages/Usuarios'
import Layout from './components/Layout'
import './index.css'

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/', element: <Layout />, children: [
    { index: true, element: <Dashboard /> },
    { path: 'expedientes', element: <Expedientes /> },
    { path: 'usuarios', element: <Usuarios /> }
  ]}
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FluentProvider theme={webLightTheme}>
      <RouterProvider router={router} />
    </FluentProvider>
  </React.StrictMode>,
)