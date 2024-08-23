import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';

type TreeNode = {
  name: string;
  size?: number; // Optional size property for leaf nodes
  children?: TreeNode[];
  value: number; // Value property for non-leaf nodes
};

type TreeMapChartProps = {
  originData: TreeNode;
  width: number;
  height: number;
};

const TreeMapChart: React.FC<TreeMapChartProps> = props => {
  const { originData, width = 1154, height = 1154 } = props;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!originData) return;

    // Convert the recursive data structure to a D3 hierarchy
    const root = d3
      .hierarchy(originData)
      .sum(d => d.size || 1) // Use size for leaf nodes, or 1 if not provided
      .sort((a, b) => b.value - a.value);

    // Compute the layout
    d3
      .treemap<TreeNode>()
      .tile(d3.treemapSquarify)
      .size([width, height])
      .padding(1)
      .round(true)(root);

    // Specify the color scale
    const color = d3
      .scaleOrdinal<string>()
      .domain(root.leaves().map(d => d.data.name))
      .range(d3.schemeTableau10);

    // Create the SVG container
    const svg = d3
      .create('svg')
      .attr('viewBox', [0, 0, width, height])
      .attr('width', width)
      .attr('height', height)
      .attr('style', 'max-width: 100%; height: auto; font: 10px sans-serif;');

    // Add a cell for each leaf of the hierarchy
    const leaf = svg
      .selectAll('g')
      .data(root.leaves())
      .join('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    // Append a color rectangle
    leaf
      .append('rect')
      .attr('id', d => d.data.name)
      .attr('fill', d => color(d.data.name))
      .attr('fill-opacity', 0.6)
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0);

    // Append text labels
    leaf
      .append('text')
      .attr('x', 3)
      .attr('y', 10)
      .text(d => d.data.name)
      .attr('fill', '#000')
      .attr('font-size', '10px');

    // Append the SVG to the ref
    d3.select(ref.current).html(''); // Clear the container before appending
    d3.select(ref.current).append(() => svg.node());
  }, [originData, width, height]);

  return <div ref={ref}></div>;
};

export default TreeMapChart;
