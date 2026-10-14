import { useEffect, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import type { Recipe } from "./types";

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID as string;

type Props = {
    recipe: Recipe;
    onExit: () => void;
};

// Looks up an ingredient for the voice agent. Matches loosely so "garlic" finds "garlic cloves".
function findIngredient(recipe: Recipe, stepIndex: number, query: string): string {
    const q = query.toLowerCase().trim();
    const matches = (name: string) => {
        const n = name.toLowerCase();
        return n.includes(q) || q.includes(n);
    };

    const inRecipe = recipe.ingredients.find((ing) => matches(ing.name));
    if (!inRecipe) return `${query} is not in this recipe.`;

    const totalText =
        inRecipe.quantity === "not specified"
            ? "The recipe amount is not specified."
            : `The whole recipe uses ${inRecipe.quantity}.`;

    const inStep = recipe.steps[stepIndex].ingredients.find((ing) => matches(ing.name));
    const stepText = !inStep
        ? " It isn't used in the current step."
        : inStep.amount === "not specified"
            ? " The amount for this step is not specified."
            : ` This step uses ${inStep.amount}.`;

    return `${inRecipe.name}: ${totalText}${stepText}`;
}

export default function CookingScreen({ recipe, onExit }: Props) {
    const total = recipe.steps.length;
    const [currentStep, setCurrentStep] = useState(0);
    const [voiceError, setVoiceError] = useState<string | null>(null);

    // Refs hold the latest values for the agent's tools (state alone can be stale inside callbacks)
    const stepRef = useRef(0);
    const startedRef = useRef(false);

    function goTo(index: number): number {
        const clamped = Math.max(0, Math.min(index, total - 1));
        stepRef.current = clamped;
        startedRef.current = true;
        setCurrentStep(clamped);
        return clamped;
    }

    function describeStep(index: number): string {
        const lastNote = index === total - 1 ? " This is the last step." : "";
        return `Step ${index + 1} of ${total}: ${recipe.steps[index].instruction}${lastNote}`;
    }

    const conversation = useConversation({
        clientTools: {
            next_step: async () => {
                if (!startedRef.current) return describeStep(goTo(0)); // "start" reads step 1
                if (stepRef.current === total - 1) {
                    return `You're already on the last step. ${describeStep(stepRef.current)}`;
                }
                return describeStep(goTo(stepRef.current + 1));
            },
            previous_step: async () => {
                if (stepRef.current === 0) return `You're on the first step. ${describeStep(0)}`;
                return describeStep(goTo(stepRef.current - 1));
            },
            get_current_step: async () => describeStep(stepRef.current),
            get_ingredient: async ({ ingredient_name }: { ingredient_name: string }) =>
                findIngredient(recipe, stepRef.current, ingredient_name),
        },
        onError: (message) => setVoiceError(String(message)),
    });

    const isConnected = conversation.status === "connected";

    async function startVoice() {
        setVoiceError(null);
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true }); // ask for mic permission
            await conversation.startSession({ agentId: AGENT_ID, connectionType: "webrtc" });
        } catch (e) {
            setVoiceError(e instanceof Error ? e.message : "Couldn't start voice.");
        }
    }

    async function stopVoice() {
        await conversation.endSession();
    }

    async function exit() {
        if (isConnected) await stopVoice();
        onExit();
    }

    // End the voice session if the user leaves this screen, so it doesn't keep using minutes
    useEffect(() => {
        return () => {
            try {
                conversation.endSession();
            } catch {
                // Not connected; nothing to end
            }
        };
    }, []);

    // Arrow keys still work for testing
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "ArrowRight") goTo(stepRef.current + 1);
            if (e.key === "ArrowLeft") goTo(stepRef.current - 1);
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const step = recipe.steps[currentStep];
    const isFirst = currentStep === 0;
    const isLast = currentStep === total - 1;

    return (
        <section>
            <button className="link" onClick={exit}>← Back to recipe</button>

            <div className="voice-row">
                <div className={`voice-status ${isConnected ? "on" : ""}`}>
                    <span className="dot" />
                    {isConnected ? (conversation.isSpeaking ? "Speaking" : "Listening") : "Voice off"}
                </div>
                <button onClick={isConnected ? stopVoice : startVoice}>
                    {isConnected ? "End voice" : "Start voice"}
                </button>
            </div>
            {voiceError && <p className="error">{voiceError}</p>}

            <p className="step-count">Step {currentStep + 1} of {total}</p>
            <div className="progress">
                <div className="progress-fill" style={{ width: `${((currentStep + 1) / total) * 100}%` }} />
            </div>

            <p className="instruction">{step.instruction}</p>

            {step.ingredients.length > 0 && (
                <>
                    <p className="step-label">For this step</p>
                    <ul className="step-ingredients">
                        {step.ingredients.map((ing) => (
                            <li key={ing.name}>
                                {ing.amount !== "not specified"
                                    ? `${ing.amount} ${ing.name}`
                                    : (() => {
                                        const total = recipe.ingredients.find((r) => r.name === ing.name)?.quantity;
                                        return total && total !== "not specified" ? `${total} ${ing.name}` : ing.name;
                                    })()}
                            </li>
                        ))}
                    </ul>
                </>
            )}

            <div className="cook-nav">
                <button onClick={() => goTo(stepRef.current - 1)} disabled={isFirst}>Back</button>
                <button className="primary" onClick={isLast ? exit : () => goTo(stepRef.current + 1)}>
                    {isLast ? "Finish" : "Next"}
                </button>
            </div>
        </section>
    );
}