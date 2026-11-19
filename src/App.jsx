import React from 'react'
import { Route, Routes } from 'react-router'
import HomeScreen from './screens/HomeScreen/HomeScreeen'
import LoginScreen from './screens/LoginScreen/LoginScreen'
import RegisterScreen from './screens/RegisterScreen/RegisterScreen'
import ForgotPasswordScreen from './screens/ForgotPasswordScreen/ForgotPasswordScreen'
import ResetPasswordScreen from './screens/ResetPasswordScreen/ResetPasswordScreen'
import VerifyEmailScreen from './screens/VerifyEmailScreen/VerifyEmailScreen'
import ResendEmailVerificationScreen from './screens/ResendEmailVerificationScreen/ResendEmailVerificationScreen'
import CreateWorkspaceScreen from './screens/CreateWorkspaceScreen/CreateWorkspaceScreen'
import WorkspaceScreen from './screens/WorkspaceScreen/WorkspaceScreen'
import WorkspaceProvider from './context/WorkspaceContext'
import AuthMiddleware from './Middleware/AuthMiddleware'

const App = () => {
  return (
    <Routes>
      <Route element={<AuthMiddleware/>}>

        <Route 
          path='/' 
          element={<HomeScreeen/>}
        />
        <Route 
          path='/home' 
          element={<HomeScreeen/>}
        />
        <Route 
          path='/workspaces/new' 
          element={<CreateWorkspaceScreen/>}
        />
        <Route element={<WorkspaceProvider/>}>
          <Route 
            path='/workspace/:workspace_id' 
            element={<WorkspaceScreen/>}
          />
        </Route>

      </Route>
      <Route path='/login' element={<LoginScreen/>}/>
      <Route path='/register' element={<RegisterScreen/>} />
      <Route path='/forgot-password' element={<ForgotPasswordScreen/>} />
      <Route path='/reset-password' element={<ResetPasswordScreen/>} />
      <Route path='/verify-email' element={<VerifyEmailScreen/>} />
      <Route path='/resend-email-verification' element={<ResendEmailVerificationScreen/>} />
    </Routes>
  )
}


export default App