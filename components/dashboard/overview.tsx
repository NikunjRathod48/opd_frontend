"use client";

import React from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

const data = [
    {
        name: "Jan",
        total: Math.floor(Math.random() * 5000) + 1000,
    },
    {
        name: "Feb",
        total: Math.floor(Math.random() * 5000) + 1000,
    },
    {
        name: "Mar",
        total: Math.floor(Math.random() * 5000) + 1000,
    },
    {
        name: "Apr",
        total: Math.floor(Math.random() * 5000) + 1000,
    },
    {
        name: "May",
        total: Math.floor(Math.random() * 5000) + 1000,
    },
    {
        name: "Jun",
        total: Math.floor(Math.random() * 5000) + 1000,
    },
    {
        name: "Jul",
        total: Math.floor(Math.random() * 5000) + 1000,
    },
    {
        name: "Aug",
        total: Math.floor(Math.random() * 5000) + 1000,
    },
    {
        name: "Sep",
        total: Math.floor(Math.random() * 5000) + 1000,
    },
    {
        name: "Oct",
        total: Math.floor(Math.random() * 5000) + 1000,
    },
    {
        name: "Nov",
        total: Math.floor(Math.random() * 5000) + 1000,
    },
    {
        name: "Dec",
        total: Math.floor(Math.random() * 5000) + 1000,
    },
];

export const Overview = React.memo(function Overview() {
    return (
        <div className="w-full h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <XAxis
                        dataKey="name"
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        dy={10}
                    />
                    <YAxis
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `$${value}`}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip
                        cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                        contentStyle={{
                            borderRadius: '12px',
                            border: '1px solid hsl(var(--border))',
                            backgroundColor: 'hsl(var(--background)/0.9)',
                            backdropFilter: 'blur(4px)',
                            color: 'hsl(var(--foreground))',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                            padding: '12px'
                        }}
                        labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
                    />
                    <Bar
                        dataKey="total"
                        fill="currentColor"
                        radius={[6, 6, 0, 0]}
                        className="fill-primary"
                        maxBarSize={50}
                        activeBar={{ fill: 'hsl(var(--primary))', opacity: 0.8 }}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
});
