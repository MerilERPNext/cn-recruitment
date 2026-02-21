import { BsToggleOff, BsToggleOn } from "react-icons/bs";
import { Typography } from "../../shared/atoms/Typography";
import Button from "../../shared/atoms/Button";

type ShowHideButtonProps = {
    showAmount: boolean;
    onToggleAmount: () => void;
};

export default function ShowHideButton({
    showAmount,
    onToggleAmount,
}: ShowHideButtonProps) {
    return (
        <Button
            onClick={onToggleAmount}
            variant="outline"
            bgColor="white"
            size="md"
            className="flex items-center gap-2 border border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
        >
            {showAmount ? (
                <>
                    <Typography variant="bodySmall" color="body1" className="font-medium">
                        Show Amounts
                    </Typography>
                    <BsToggleOff className="w-6 h-6 text-gray-400" />
                </>
            ) : (
                <>
                    <Typography variant="bodySmall" color="body1" className="font-medium">
                        Hide Amounts
                    </Typography>
                    <BsToggleOn className="w-6 h-6 text-primary" />
                </>
            )}
        </Button>
    );
}