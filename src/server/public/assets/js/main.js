const toggleButton = document.querySelector("#toggle-nav");
const toc = document.querySelector("#toc");

const mobileOverlayClasses = [
  "fixed",
  "inset-0",
  "z-50",
  "mx-auto",
  "max-w-md",
  "overflow-y-auto",
  "bg-slate-950/95",
  "p-6",
  "backdrop-blur"
];

const openToc = () => {
  if (!toc) return;
  toc.classList.remove("hidden");
  if (window.innerWidth < 1024) {
    toc.classList.add(...mobileOverlayClasses);
    document.body.style.overflow = "hidden";
  }
};

const closeToc = () => {
  if (!toc) return;
  toc.classList.remove(...mobileOverlayClasses);
  document.body.style.overflow = "";
  if (window.innerWidth < 1024) {
    toc.classList.add("hidden");
  }
};

const syncTocToViewport = () => {
  if (!toc) return;
  if (window.innerWidth >= 1024) {
    toc.classList.remove("hidden", ...mobileOverlayClasses);
    document.body.style.overflow = "";
  } else {
    toc.classList.add("hidden");
    toc.classList.remove(...mobileOverlayClasses);
    document.body.style.overflow = "";
  }
};

if (toggleButton && toc) {
  toggleButton.addEventListener("click", () => {
    if (toc.classList.contains("hidden")) {
      openToc();
    } else {
      closeToc();
    }
  });

  toc.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLAnchorElement) {
      closeToc();
    }
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeToc();
  }
});

window.addEventListener("resize", syncTocToViewport);
window.addEventListener("load", syncTocToViewport);
