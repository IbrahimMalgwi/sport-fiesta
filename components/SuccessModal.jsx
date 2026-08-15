"use client";
// components/SuccessModal.jsx
import React from "react";

export default function SuccessModal({ show, registrant, onClose }) {
    if (!show || !registrant) return null;
    const color = registrant.houseColor || "#111827";

    return (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative z-10 max-w-sm w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6 text-center">
                    <div className="mx-auto w-20 h-20 rounded-lg" style={{ background: color }} />
                    <h3 className="mt-4 text-xl font-semibold">Congratulations, {registrant.fullName}!</h3>
                    <p className="mt-2 text-slate-700">
                        You have been assigned to <span className="font-semibold" style={{ color: registrant.houseColor }}>{registrant.houseName}</span> ({registrant.houseKey}) house.
                    </p>
                    <div className="mt-6 flex justify-center gap-3">
                        <button onClick={onClose} className="px-4 py-2 rounded-lg border">Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
