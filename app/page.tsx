"use client";

import { useEffect, useRef, useState } from "react";
import type { FogSpot, Place } from "@/lib/types";
import { usePlaces } from "@/hooks/usePlaces";
import MapCanvas, { type MapHandle } from "@/components/MapCanvas";
import Hud from "@/components/Hud";
import BottomSheet from "@/components/BottomSheet";
import ClaimForm from "@/components/ClaimForm";
import PlaceDetail from "@/components/PlaceDetail";
import Gallery from "@/components/Gallery";
import Celebration from "@/components/Celebration";

type Sheet =
  | { kind: "claim"; fog: FogSpot }
  | { kind: "detail"; place: Place }
  | { kind: "edit"; place: Place }
  | null;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

export default function Page() {
  const { state, ready, claim, updatePlace, removePhoto, deletePlace, latestPlace } =
    usePlaces();
  const reduced = usePrefersReducedMotion();
  const mapRef = useRef<MapHandle>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [celebrate, setCelebrate] = useState<Place | null>(null);

  const recenter = () => {
    const target = latestPlace ?? { x: 0, y: 0 };
    mapRef.current?.flyTo(target.x, target.y, 1.1);
  };

  const handleClaim = (data: {
    title: string;
    text: string;
    location: string;
    companions: Place["companions"];
    photo: Blob | null;
  }) => {
    if (sheet?.kind !== "claim") return;
    const place = claim({ fogId: sheet.fog.id, ...data });
    setSheet(null);
    if (place) {
      mapRef.current?.jumpTo(place.x, place.y, 1.25);
      setCelebrate(place);
    }
  };

  const handleEdit = (data: {
    title: string;
    text: string;
    location: string;
    companions: Place["companions"];
    photo: Blob | null;
  }) => {
    if (sheet?.kind !== "edit") return;
    const base = sheet.place;
    updatePlace(base.id, {
      title: data.title.trim() || base.title,
      text: data.text.trim(),
      location: data.location.trim() || undefined,
      companions: data.companions,
      photo: data.photo,
    });
    setSheet({
      kind: "detail",
      place: {
        ...base,
        title: data.title.trim() || base.title,
        text: data.text.trim(),
        location: data.location.trim() || undefined,
        companions: data.companions,
        photo: data.photo,
      },
    });
  };

  return (
    <main className="map-frame relative h-full w-full overflow-hidden">
      {ready && (
        <MapCanvas
          ref={mapRef}
          places={state.places}
          fog={state.fog}
          bounds={state.bounds}
          activeId={latestPlace?.id}
          reduced={reduced}
          onTapFog={(fog) => setSheet({ kind: "claim", fog })}
          onTapPlace={(place) => setSheet({ kind: "detail", place })}
        />
      )}

      {!ready && (
        <div className="flex h-full w-full items-center justify-center">
          <p className="animate-pulse font-display text-2xl text-ink">
            Unfurling the map…
          </p>
        </div>
      )}

      {ready && (
        <Hud
          onAddExperience={() => mapRef.current?.focusNearestFog()}
          onRecenter={recenter}
          onZoomIn={() => mapRef.current?.zoomBy(1.25)}
          onZoomOut={() => mapRef.current?.zoomBy(0.8)}
        />
      )}

      <Gallery
        open={galleryOpen}
        places={state.places}
        onClose={() => setGalleryOpen(false)}
        onSelect={(place) => {
          setGalleryOpen(false);
          setSheet({ kind: "detail", place });
        }}
      />

      <Celebration
        place={celebrate}
        reduced={reduced}
        onView={() => {
          if (celebrate) mapRef.current?.flyTo(celebrate.x, celebrate.y, 1.25);
          setCelebrate(null);
        }}
        onClose={() => setCelebrate(null)}
      />

      <BottomSheet
        open={sheet?.kind === "claim"}
        onClose={() => setSheet(null)}
        labelledBy="claim-title"
      >
        {sheet?.kind === "claim" && (
          <ClaimForm onSubmit={handleClaim} onCancel={() => setSheet(null)} />
        )}
      </BottomSheet>

      <BottomSheet
        open={sheet?.kind === "edit"}
        onClose={() =>
          setSheet((s) =>
            s?.kind === "edit" ? { kind: "detail", place: s.place } : s,
          )
        }
        labelledBy="edit-title"
      >
        {sheet?.kind === "edit" && (
          <ClaimForm
            key={sheet.place.id}
            place={
              state.places.find((p) => p.id === sheet.place.id) ?? sheet.place
            }
            onSubmit={handleEdit}
            onCancel={() => setSheet({ kind: "detail", place: sheet.place })}
          />
        )}
      </BottomSheet>

      <BottomSheet
        open={sheet?.kind === "detail"}
        onClose={() => setSheet(null)}
        labelledBy="detail-title"
      >
        {sheet?.kind === "detail" && (() => {
          const place =
            state.places.find((p) => p.id === sheet.place.id) ?? sheet.place;
          return (
            <PlaceDetail
              place={place}
              onEdit={() => setSheet({ kind: "edit", place })}
              onAddPhoto={(photo) => updatePlace(place.id, { photo })}
              onRemovePhoto={() => removePhoto(place.id)}
              onDelete={() => {
                deletePlace(place.id);
                setSheet(null);
              }}
            />
          );
        })()}
      </BottomSheet>
    </main>
  );
}
