import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { select } from 'd3-selection';
import { scaleLinear, scaleBand } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { interpolateRdBu } from 'd3-scale-chromatic';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Maximize2 } from 'lucide-react';

interface CorrelationHeatmapProps {
  matrix: number[][];
  labels: string[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CorrelationHeatmap({ 
  matrix, 
  labels, 
  isOpen, 
  onOpenChange 
}: CorrelationHeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderTrigger, setRenderTrigger] = useState(0);
  
  // Force re-render when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Delay to ensure dialog is fully mounted
      const timer = setTimeout(() => {
        setRenderTrigger(prev => prev + 1);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Use Layout Effect for DOM measurements and sync rendering
  useLayoutEffect(() => {
    if (!isOpen || !svgRef.current) return;
    
    // Clear any previous rendering
    select(svgRef.current).selectAll("*").remove();
    
    // Check if we have valid data
    if (!matrix.length || !labels.length) {
      // Render a message for no data
      const svg = select(svgRef.current)
        .attr("width", 400)
        .attr("height", 300);
        
      svg.append("text")
        .attr("x", 200)
        .attr("y", 150)
        .attr("text-anchor", "middle")
        .text("No data available to display");
      
      return;
    }
    
    // Define fixed dimensions for more reliable rendering
    const fixedWidth = 700;
    const fixedHeight = 700;
    const margin = { top: 50, right: 30, bottom: 120, left: 120 };
    const width = fixedWidth - margin.left - margin.right;
    const height = fixedHeight - margin.top - margin.bottom;
    
    // Create SVG with fixed dimensions
    const svg = select(svgRef.current)
      .attr("width", fixedWidth)
      .attr("height", fixedHeight)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create scales
    const x = scaleBand()
      .domain(labels)
      .range([0, width])
      .padding(0.05);

    const y = scaleBand()
      .domain(labels)
      .range([0, height])
      .padding(0.05);

    const color = scaleLinear<string>()
      .domain([-1, 0, 1])
      .range([interpolateRdBu(0), interpolateRdBu(0.5), interpolateRdBu(1)]);

    // Add X axis
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em");

    // Add Y axis
    svg.append("g")
      .call(axisLeft(y));

    // Add correlation matrix cells
    for (let i = 0; i < labels.length; i++) {
      for (let j = 0; j < labels.length; j++) {
        const correlationValue = matrix[i][j] || 0;
        
        svg.append("rect")
          .attr("x", x(labels[j]) || 0)
          .attr("y", y(labels[i]) || 0)
          .attr("width", x.bandwidth())
          .attr("height", y.bandwidth())
          .style("fill", color(correlationValue));

        // Only add text if the rectangle is big enough
        if (x.bandwidth() > 25 && y.bandwidth() > 25) {
          svg.append("text")
            .attr("x", (x(labels[j]) || 0) + x.bandwidth() / 2)
            .attr("y", (y(labels[i]) || 0) + y.bandwidth() / 2)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", "10px")
            .style("fill", Math.abs(correlationValue) > 0.5 ? "#ffffff" : "#000000")
            .text(correlationValue.toFixed(2));
        }
      }
    }

    // Add title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text("Correlation Heatmap");

  }, [matrix, labels, isOpen, renderTrigger]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Maximize2 className="h-4 w-4" />
          View Heatmap
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] max-h-[90vh] w-[800px]">
        <DialogHeader>
          <DialogTitle>Correlation Heatmap</DialogTitle>
          <DialogDescription>
            Visualize correlations between all numeric features
          </DialogDescription>
        </DialogHeader>
        <div ref={containerRef} className="overflow-auto h-[600px] w-full flex items-center justify-center">
          <svg ref={svgRef} preserveAspectRatio="xMinYMin meet"></svg>
        </div>
      </DialogContent>
    </Dialog>
  );
} 