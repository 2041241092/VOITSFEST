import React from "react";

interface CustomHeadingProps {
  text: string;
  className?: string;
  as?: React.ElementType;
}

export default function CustomHeading({ text, className = "", as: Component = "h2" }: CustomHeadingProps) {
  const words = text.split(" ");
  return (
    <Component className={className}>
      {words.map((word, i) => {
        if (!word) return null;
        const firstLetter = word.charAt(0);
        const restOfWord = word.slice(1);
        
        return (
          <React.Fragment key={i}>
            <span className="inline-block">
              <span className="font-ruthie text-[1.25em] leading-none">{firstLetter}</span>
              <span className="font-inter">{restOfWord}</span>
            </span>
            {i < words.length - 1 && " "}
          </React.Fragment>
        );
      })}
    </Component>
  );
}
