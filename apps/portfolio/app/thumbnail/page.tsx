"use client"

import React from "react"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { ThumbnailChat } from "@/components/marketing/thumbnail-chat"
import { ThumbnailModels } from "@/components/marketing/thumbnail-models"
import { ThumbnailSettings } from "@/components/marketing/thumbnail-settings"
import { ThumbnailVA } from "@/components/marketing/thumbnail-v-a"
import { ThumbnailVB } from "@/components/marketing/thumbnail-v-b"
import { ThumbnailVC } from "@/components/marketing/thumbnail-v-c"
import { ThumbnailVD } from "@/components/marketing/thumbnail-v-d"

const vignettes: Record<string, React.ComponentType> = {
  "1": ThumbnailChat,
  "2": ThumbnailModels,
  "3": ThumbnailSettings,
  "a": ThumbnailVA,
  "b": ThumbnailVB,
  "c": ThumbnailVC,
  "d": ThumbnailVD,
}

function ThumbnailContent() {
  const searchParams = useSearchParams()
  const v = searchParams.get("v") ?? "1"
  const Component = vignettes[v] ?? ThumbnailChat

  return (
    <div className="w-[1200px] h-[630px]">
      <Component />
    </div>
  )
}

export default function ThumbnailPage() {
  return (
    <Suspense fallback={<div className="w-[1200px] h-[630px] bg-background" />}>
      <ThumbnailContent />
    </Suspense>
  )
}
