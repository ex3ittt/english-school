import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 18, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const LockIcon = (p: P) => (
  <Svg {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="1.5" />
    <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
    <path d="M12 14.5v2.2" />
  </Svg>
);

export const CheckIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4.5 12.8l4.6 4.4L19.5 6.8" />
  </Svg>
);

export const PlayIcon = (p: P) => (
  <Svg {...p}>
    <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none" />
  </Svg>
);

export const FileIcon = (p: P) => (
  <Svg {...p}>
    <path d="M14 3.5H7a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8z" />
    <path d="M14 3.5V8h4.5" />
    <path d="M9 13h6M9 16.5h4" />
  </Svg>
);

export const DownloadIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 4v11" />
    <path d="M7.5 11 12 15.5 16.5 11" />
    <path d="M5 19.5h14" />
  </Svg>
);

export const ChevronDownIcon = (p: P) => (
  <Svg {...p}>
    <path d="M6 9.5l6 6 6-6" />
  </Svg>
);

export const ArrowRightIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4.5 12h14.5" />
    <path d="M13.5 6.5 19 12l-5.5 5.5" />
  </Svg>
);

export const ArrowLeftIcon = (p: P) => (
  <Svg {...p}>
    <path d="M19.5 12H5" />
    <path d="M10.5 6.5 5 12l5.5 5.5" />
  </Svg>
);

export const HomeIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 11.2 12 4.5l8 6.7" />
    <path d="M6.5 9.5v10h11v-10" />
  </Svg>
);

export const StackIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 7.5 12 4l8 3.5-8 3.5z" />
    <path d="M4 12l8 3.5 8-3.5" />
    <path d="M4 16.5 12 20l8-3.5" />
  </Svg>
);

export const ClockIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);

export const GripIcon = (p: P) => (
  <Svg {...p} strokeWidth={0}>
    {[7, 12, 17].map((y) => (
      <g key={y} fill="currentColor">
        <circle cx="9" cy={y} r="1.4" />
        <circle cx="15" cy={y} r="1.4" />
      </g>
    ))}
  </Svg>
);

export const PlusIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const CloseIcon = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const UploadIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 16V4.5" />
    <path d="M7.5 9 12 4.5 16.5 9" />
    <path d="M5 19.5h14" />
  </Svg>
);

export const UserIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.5 20c1.2-3.6 4-5.3 7.5-5.3s6.3 1.7 7.5 5.3" />
  </Svg>
);

export const TrashIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4.5 7h15" />
    <path d="M9.5 7V4.5h5V7" />
    <path d="M6.5 7l1 13h9l1-13" />
  </Svg>
);

export const TextIcon = (p: P) => (
  <Svg {...p}>
    <path d="M5 6.5h14M5 11h14M5 15.5h9" />
  </Svg>
);

export const VideoIcon = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="6" width="12" height="12" rx="1.5" />
    <path d="m15.5 10.5 5-3v9l-5-3" />
  </Svg>
);
