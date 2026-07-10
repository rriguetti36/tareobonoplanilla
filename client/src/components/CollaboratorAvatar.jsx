import React, { useEffect, useState } from 'react'
import { Avatar } from '@chakra-ui/react'
import api from '../services/api'

export default function CollaboratorAvatar({ collaborator, size = 'md' }) {
  const [src, setSrc] = useState(null)

  useEffect(() => {
    let objectUrl
    if (collaborator?.id && collaborator?.photoPath) {
      api.get(`/collaborators/${collaborator.id}/photo`, { responseType: 'blob' })
        .then(({ data }) => {
          objectUrl = URL.createObjectURL(data)
          setSrc(objectUrl)
        })
        .catch(() => setSrc(null))
    } else {
      setSrc(null)
    }
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [collaborator?.id, collaborator?.photoPath])

  return <Avatar size={size} src={src || undefined} name={`${collaborator?.firstName || ''} ${collaborator?.lastName || ''}`} />
}
