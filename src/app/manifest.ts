import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Marlow Dental",
    short_name: "Marlow Dental",
    description: "Independent dental practice in Lincoln Park, Chicago. Dr. Sarah Marlow, DDS.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF7F2",
    theme_color: "#1F3D34",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
