import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const activityData = [
    {
        name: "Olivia Martin",
        email: "olivia.martin@email.com",
        amount: "+$1,999.00",
        initials: "OM",
        action: "New Appointment"
    },
    {
        name: "Jackson Lee",
        email: "jackson.lee@email.com",
        amount: "+$39.00",
        initials: "JL",
        action: "Follow-up"
    },
    {
        name: "Isabella Nguyen",
        email: "isabella.nguyen@email.com",
        amount: "+$299.00",
        initials: "IN",
        action: "Consultation"
    },
    {
        name: "William Kim",
        email: "will@email.com",
        amount: "+$99.00",
        initials: "WK",
        action: "Lab Results"
    },
    {
        name: "Sofia Davis",
        email: "sofia.davis@email.com",
        amount: "+$39.00",
        initials: "SD",
        action: "Prescription"
    }
];

export function RecentActivity() {
    return (
        <div className="space-y-8">
            {activityData.map((item, index) => (
                <div key={index} className="flex items-center group cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors">
                    <Avatar className="h-9 w-9 transition-transform group-hover:scale-110">
                        <AvatarImage src="/avatars/01.png" alt="Avatar" />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">{item.initials}</AvatarFallback>
                    </Avatar>
                    <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none group-hover:text-primary transition-colors">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                            {item.email}
                        </p>
                    </div>
                    <div className="ml-auto font-medium text-sm">
                        <span className="block text-right">{item.amount}</span>
                        <span className="block text-xs text-muted-foreground text-right font-normal">{item.action}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
