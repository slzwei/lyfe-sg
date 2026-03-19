"use client";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}

export default function StepIndicator({
  currentStep,
  totalSteps,
  labels,
}: StepIndicatorProps) {
  return (
    <div className="mb-8">
      {/* Mobile: compact */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between text-sm text-stone-500 mb-2">
          <span>
            Step {currentStep} of {totalSteps}
          </span>
          {labels && labels[currentStep - 1] && (
            <span className="font-medium text-stone-700">
              {labels[currentStep - 1]}
            </span>
          )}
        </div>
        <div className="h-2 rounded-full bg-stone-200">
          <div
            className="h-2 rounded-full bg-orange-500 transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop: circles with connectors */}
      <div className="hidden sm:flex items-center justify-center gap-0">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1;
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;
          return (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    isCompleted
                      ? "bg-orange-500 text-white"
                      : isCurrent
                        ? "border-2 border-orange-500 bg-white text-orange-500"
                        : "border-2 border-stone-200 bg-white text-stone-400"
                  }`}
                >
                  {isCompleted ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step
                  )}
                </div>
                {labels && labels[i] && (
                  <span
                    className={`mt-1.5 text-xs whitespace-nowrap ${
                      isCurrent
                        ? "font-medium text-orange-600"
                        : isCompleted
                          ? "text-stone-500"
                          : "text-stone-400"
                    }`}
                  >
                    {labels[i]}
                  </span>
                )}
              </div>
              {step < totalSteps && (
                <div
                  className={`mx-1 h-0.5 w-8 lg:w-12 ${
                    isCompleted ? "bg-orange-500" : "bg-stone-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
