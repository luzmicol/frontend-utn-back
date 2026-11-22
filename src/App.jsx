import React from 'react'
import { Route, Routes } from 'react-router-dom'
import LoginScreen from './screens/LoginScreen/LoginScreen'
import RegisterScreen from './screens/RegisterScreen/RegisterScreen'
import ForgotPasswordScreen from './screens/ForgotPasswordScreen/ForgotPasswordScreen'
import ResetPasswordScreen from './screens/ResetPasswordScreen/ResetPasswordScreen'
import VerifyEmailScreen from './screens/VerifyEmailScreen/VerifyEmailScreen'
import ResendEmailVerificationScreen from './screens/ResendEmailVerificationScreen/ResendEmailVerificationScreen'
import FeedScreen from './screens/FeedScreen/FeedScreen'
import ExploreScreen from './screens/ExploreScreen/ExploreScreen'
import CommunitiesScreen from './screens/CommunitiesScreen/CommunitiesScreen'
import ProfileScreen from './screens/ProfileScreen/ProfileScreen'
import NotFoundScreen from './screens/NotFoundScreen/NotFoundScreen'
import AppLayout from './Components/Layout/AppLayout'
import AuthMiddleware from './Middleware/AuthMiddleware'

const App = () => {
  return (
    <Routes>
      <Route element={<AuthMiddleware />}>
        <Route element={<AppLayout />}>
          <Route path='/' element={<FeedScreen />} />
          <Route path='/explore' element={<ExploreScreen />} />
          <Route path='/communities' element={<CommunitiesScreen />} />
          <Route path='/profile' element={<ProfileScreen />} />
        </Route>
      </Route>

      <Route path='/login' element={<LoginScreen />} />
      <Route path='/register' element={<RegisterScreen />} />
      <Route path='/forgot-password' element={<ForgotPasswordScreen />} />
      <Route path='/reset-password' element={<ResetPasswordScreen />} />
      <Route path='/verify-email' element={<VerifyEmailScreen />} />
      <Route path='/resend-email-verification' element={<ResendEmailVerificationScreen />} />
      <Route path='*' element={<NotFoundScreen />} />
    </Routes>
  )
}

export default App
