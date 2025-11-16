'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type VideoModalProps = {
  isOpen: boolean
  onClose: () => void
  videoUrl: string
  title: string
}

// Convert YouTube URL to embed URL
function getYouTubeEmbedUrl(url: string): string {
  if (!url) return ''

  // Handle different YouTube URL formats
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/
  const match = url.match(regExp)
  const videoId = match && match[2].length === 11 ? match[2] : null

  return videoId ? `https://www.youtube.com/embed/${videoId}` : url
}

export default function VideoModal({ isOpen, onClose, videoUrl, title }: VideoModalProps) {
  const embedUrl = getYouTubeEmbedUrl(videoUrl)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[90vw]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="aspect-video w-full">
          <iframe
            src={embedUrl}
            title={title}
            className="w-full h-full rounded"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
