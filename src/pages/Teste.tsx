import { useState, useCallback } from "react";
import { ShirtSelectionScreen, type Shirt } from "@/components/wizard/ShirtSelectionScreen";
import { BackgroundSelectionScreen } from "@/components/wizard/BackgroundSelectionScreen";
import { UploadScreen } from "@/components/wizard/UploadScreen";
import { StepIndicator } from "@/components/wizard/StepIndicator";
import { TestResultScreen } from "@/components/wizard/TestResultScreen";
import type { Background } from "@/config/fanframe";

type TestStep = "shirt" | "background" | "upload" | "result";

const STEP_ORDER: TestStep[] = ["shirt", "background", "upload", "result"];
const STEP_LABELS = ["Manto", "Cenário", "Foto", "Resultado"];

export default function Teste() {
  const [currentStep, setCurrentStep] = useState<TestStep>("shirt");
  const [selectedShirt, setSelectedShirt] = useState<Shirt | null>(null);
  const [selectedBackground, setSelectedBackground] = useState<Background | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const goToStep = useCallback((step: TestStep) => {
    setCurrentStep(step);
  }, []);

  const handleShirtSelect = useCallback((shirt: Shirt) => {
    setSelectedShirt(shirt);
  }, []);

  const handleBackgroundSelect = useCallback((background: Background) => {
    setSelectedBackground(background);
  }, []);

  const handleImageUpload = useCallback((base64: string) => {
    setUploadedImage(base64);
  }, []);

  const handleClearImage = useCallback(() => {
    setUploadedImage(null);
  }, []);

  const handleTryAgain = useCallback(() => {
    setSelectedShirt(null);
    setSelectedBackground(null);
    setUploadedImage(null);
    goToStep("shirt");
  }, [goToStep]);

  const currentStepNumber = STEP_ORDER.indexOf(currentStep) + 1;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <StepIndicator
        currentStep={currentStepNumber}
        totalSteps={STEP_ORDER.length}
        labels={STEP_LABELS}
      />

      {currentStep === "shirt" && (
        <ShirtSelectionScreen
          selectedShirt={selectedShirt}
          onSelectShirt={handleShirtSelect}
          onContinue={() => goToStep("background")}
          onBack={() => {}}
        />
      )}

      {currentStep === "background" && (
        <BackgroundSelectionScreen
          selectedBackground={selectedBackground}
          onSelectBackground={handleBackgroundSelect}
          onContinue={() => goToStep("upload")}
          onBack={() => goToStep("shirt")}
        />
      )}

      {currentStep === "upload" && (
        <UploadScreen
          uploadedImage={uploadedImage}
          onImageUpload={handleImageUpload}
          onClearImage={handleClearImage}
          onContinue={() => goToStep("result")}
          onBack={() => goToStep("background")}
        />
      )}

      {currentStep === "result" && selectedShirt && selectedBackground && uploadedImage && (
        <TestResultScreen
          userImage={uploadedImage}
          selectedShirt={selectedShirt}
          selectedBackground={selectedBackground}
          onTryAgain={handleTryAgain}
        />
      )}
    </div>
  );
}
