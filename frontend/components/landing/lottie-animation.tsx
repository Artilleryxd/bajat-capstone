"use client"
import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export const Animation = () => {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <DotLottieReact
        src="https://lottie.host/7ed0998b-a92c-450d-b0e9-a621a0e24273/lDGvn5tCRp.lottie" 
        loop
        autoplay
        className="w-full h-full max-w-md object-contain mx-auto"
      />
    </div>
  );
};
