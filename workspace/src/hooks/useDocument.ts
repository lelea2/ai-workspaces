import { useContext } from 'react'
import { DocumentContext } from '../store/DocumentContext'

export function useDocument() {
  return useContext(DocumentContext)
}
