// components/HouseCard.jsx
import React from "react";

export default function HouseCard({ houseKey, houseName, color, count = 0 }) {
    return (
        <div className="rounded-2xl shadow p-4 text-white" style={{ background: color }}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs opacity-90">{houseKey}</p>
                    <h3 className="text-lg font-bold">{houseName}</h3>
                </div>
                <div className="text-3xl font-extrabold">{count}</div>
            </div>
        </div>
    );
}
