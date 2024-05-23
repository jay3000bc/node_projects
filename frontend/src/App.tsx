import './App.css'
// import { io } from 'socket.io-client';
// import User from './pages/User';
import Admin from './pages/Admin';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import NotFound from './pages/NotFound';
import ChatBox from './components/ChatBox';
import { logo, title } from './config';
import { AdminProvider, UserProvider } from './context/AuthContext';
import PersistLogin from './components/PersistLogin';


function App() {

  return (
    <AdminProvider>
      <UserProvider>
        <main className='max-w-[1000px] mx-auto px-2'>
          <div className='flex items-center justify-center gap-4 mb-4'>
            {logo()}
            <h1 className='text-3xl text-center font-semibold my-4'>
              {title}
            </h1>
          </div>

          <Router basename='/dipankar/frontend/chatbot/'>
          {/* <Router> */}
                <Routes>
                  <Route path="/" element={<PersistLogin type="user" />}>
                    <Route index element={<ChatBox />} />
                  </Route>
                  <Route path="/admin" element={<PersistLogin type="admin" />}>
                    <Route index element={<Admin />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
          </Router>

          
        </main>
      </UserProvider>
    </AdminProvider>
  )
}

export default App
