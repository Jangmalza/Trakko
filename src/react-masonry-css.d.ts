
declare module 'react-masonry-css' {
  import * as React from 'react';

  interface MasonryProps extends React.HTMLAttributes<HTMLElement> {
    breakpointCols: number | { [key: string]: number; default: number };
    columnClassName?: string;
  }

  const Masonry: React.FC<MasonryProps>;
  export default Masonry;
}
