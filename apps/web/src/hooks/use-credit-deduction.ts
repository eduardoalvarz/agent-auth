import { useAuthContext } from "@/providers/Auth";
import { useCreditsContext } from "@/providers/Credits";
import { deductUserCredits, addUserCredits } from "@/lib/stripe";
import { toast } from "sonner";

interface CreditDeductionOptions {
  /** The reason for the credit deduction (used in toast messages) */
  reason?: string;
  /** Number of credits to deduct (default: 1) */
  creditsToDeduct?: number;
  /** Whether to show success toast (default: false) */
  showSuccessToast?: boolean;
}

interface CreditDeductionResult {
  success: boolean;
  newBalance?: number;
  error?: string;
  refundCredits?: () => Promise<void>;
}

export function useCreditDeduction() {
  const { user, isAuthenticated } = useAuthContext();
  const {
    credits,
    deductCredits: optimisticDeduct,
    addCredits: optimisticAdd,
    refreshCredits,
  } = useCreditsContext();

  const deductCredits = async (
    options: CreditDeductionOptions = {},
  ): Promise<CreditDeductionResult> => {
    const {
      reason = "message",
      creditsToDeduct = 1,
      showSuccessToast = false,
    } = options;

    // Check if user is authenticated
    if (!isAuthenticated || !user?.id) {
      toast.error("Authentication required", {
        description: `You must be signed in to ${reason === "message" ? "send messages" : reason}.`,
        duration: 5000,
      });
      return { success: false, error: "Not authenticated" };
    }

    // Check if user has sufficient credits before optimistic update
    if (credits !== null && credits < creditsToDeduct) {
      toast.error("Insufficient credits", {
        description: `You don't have enough credits to ${reason === "message" ? "send this message" : reason}.`,
        duration: 5000,
      });
      return { success: false, error: "Insufficient credits" };
    }

    try {
      // Only perform optimistic deduction if we have sufficient credits
      let didOptimisticDeduct = false;
      if (credits !== null && credits >= creditsToDeduct) {
        optimisticDeduct(creditsToDeduct);
        didOptimisticDeduct = true;
      }

      // Deduct credits from database
      const creditResult = await deductUserCredits(user.id, creditsToDeduct);

      if (!creditResult.success) {
        // Only revert if we actually did an optimistic deduction
        if (didOptimisticDeduct) {
          optimisticAdd(creditsToDeduct);
        }

        toast.error("Insufficient credits", {
          description: `You don't have enough credits to ${reason === "message" ? "send this message" : reason}.`,
          duration: 5000,
        });
        return { success: false, error: "Insufficient credits" };
      }

      // Update the credits context with the actual balance from server
      refreshCredits();

      // Show success toast if enabled
      if (showSuccessToast) {
        const creditText = creditsToDeduct === 1 ? "credit" : "credits";
        toast.success(`${creditsToDeduct} ${creditText} deducted`, {
          description: `Used for ${reason}. Remaining balance: ${creditResult.newBalance}`,
          duration: 3000,
        });
      }

      // Return result with refund function for failed requests
      return {
        success: true,
        newBalance: creditResult.newBalance,
        refundCredits: async () => {
          try {
            await addUserCredits(user.id, creditsToDeduct);
            // Update UI optimistically
            optimisticAdd(creditsToDeduct);
            // Refresh to get exact balance
            refreshCredits();

            toast.info("Credits refunded", {
              description: `${creditsToDeduct} ${creditsToDeduct === 1 ? "credit" : "credits"} refunded due to server error.`,
              duration: 4000,
            });
          } catch (error) {
            console.error("Failed to refund credits:", error);
            // Refresh credits to get the correct state if refund fails
            refreshCredits();
          }
        },
      };
    } catch (error: any) {
      // Only revert if we actually did an optimistic deduction
      if (credits !== null && credits >= creditsToDeduct) {
        optimisticAdd(creditsToDeduct);
      }

      if (error.message === "Insufficient credits") {
        toast.error("Insufficient credits", {
          description: `You don't have enough credits to ${reason === "message" ? "send this message" : reason}. Please purchase more credits.`,
          duration: 5000,
        });
      } else {
        toast.error("Credit deduction failed", {
          description:
            "There was an error processing your credits. Please try again.",
          duration: 5000,
        });
        console.error("Credit deduction error:", error);
      }
      return { success: false, error: error.message };
    }
  };

  return {
    deductCredits,
    isAuthenticated,
    userId: user?.id,
  };
}
