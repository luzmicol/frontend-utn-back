import React, { useEffect, useState } from 'react'
import useRequest from '../../hooks/useRequest'
import { getAllWorkspaces } from '../../services/workspaceService'
import {Link} from 'react-router-dom'
import WorkspaceList from '../../Components/WorkspaceList/WorkspaceList'

function HomeScreeen() {

  

  return (
    <div>
      <h1>Bienvenido a slack!</h1>
      <div>
        <h2>Mis espacios de trabajo:</h2>
        <WorkspaceList/>
        <Link to='/workspaces/new'>Crear espacio de trabajo</Link>
      </div>
    </div>
  )
}

export default HomeScreeen