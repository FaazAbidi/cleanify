import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CorrelationInfo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Understanding Correlations</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4">
          Correlation values range from -1 to 1:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>1.0:</strong> Perfect positive correlation (as one variable increases, the other increases proportionally)</li>
          <li><strong>0.0:</strong> No correlation (variables appear unrelated)</li>
          <li><strong>-1.0:</strong> Perfect negative correlation (as one variable increases, the other decreases proportionally)</li>
        </ul>
        <p className="mt-4">
          Generally, correlation values above 0.7 or below -0.7 indicate strong relationships, while values between -0.3 and 0.3 suggest weak or no relationship.
        </p>
      </CardContent>
    </Card>
  );
} 