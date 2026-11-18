// Projects shown in the "Beyond the browser" section. Edit freely.
//
// IMAGES: drop a file at each `image` path (inside /public) — e.g. public/beyond/snapforge.webp.
// Any aspect works (it is cover-fitted; ~16:10 looks best). Until a file exists, a placeholder
// in the `tone` colours is shown.

export const BEYOND = [
  {
    id: "snapforge",
    index: "01",
    title: "SnapForge",
    kind: "Group project",
    line: "A live collage maker.",
    role: ["Developed the static JS version", "Worked on the UI of the Python version"],
    stats: [],
    image: "/beyond/snapforge.webp",
    tone: ["#e9dcc3", "#c9b489"],
  },
  {
    id: "microplastic",
    index: "02",
    title: "Microplastic Detection",
    kind: "Machine learning",
    line: "Detecting microplastics using ML.",
    role: ["Developed the Python GUI", "Trained two models — YOLOv8n and YOLOv8s"],
    stats: [
      { value: "92%", label: "YOLOv8n accuracy" },
      { value: "94%", label: "YOLOv8s accuracy" },
    ],
    image: "/beyond/microplastic.webp",
    tone: ["#cfdcd8", "#8fa9a3"],
  },
  {
    id: "lilo",
    index: "03",
    title: "Lilo",
    kind: "Entrepreneurship project",
    line: "A child safety wrist band.",
    role: ["Designed the 3D model", "Developed the app", "Worked partly on the hardware"],
    stats: [],
    image: "/beyond/lilo.webp",
    tone: ["#ddd2ea", "#b29fcf"],
  },
];
