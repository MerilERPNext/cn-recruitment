import { useEffect, useState } from "react";
import { Coordinates, getLocationName } from "../../utils/helperUtils";
import SideDrawer from "../shared/SideDrawer";
import Button from "../shared/atoms/Button";

const GeoLocationModal = ({
    open,
    onClose,
    onSubmit,
    location,
    label,
}: {
    label: string;
    open: boolean;
    onClose: () => void;
    onSubmit: () => void;
    location: Coordinates | null;
}) => {
    const [locationName, setLocationName] = useState("Loading location...");

    useEffect(() => {
        if (!location) return;

        const loadLocation = async () => {
            const name = await getLocationName(location.latitude, location.longitude);
            setLocationName(name);
        };

        if (location?.latitude && location?.longitude) {
            loadLocation();
        }

    }, [location]);

    if (!location) return null;

    const { latitude, longitude } = location;

    const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.005
        }%2C${latitude - 0.005}%2C${longitude + 0.005}%2C${latitude + 0.005
        }&layer=mapnik&marker=${latitude}%2C${longitude}`;

    return (
        <SideDrawer title={label} open={open} onClose={onClose} className="p-0">
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

                {/* Map */}
                <div style={{ width: "100%", height: 250 }}>
                    <iframe
                        title="OpenStreetMap"
                        src={mapSrc}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                    />
                </div>

                {/* Location Info */}
                <div style={{ padding: 16 }}>
                    <p style={{ fontSize: 14, color: "#666" }}>Current Location</p>

                    <p style={{ fontWeight: 500 }}>
                        {locationName}
                    </p>
                </div>

                {/* Footer */}
                <div
                    style={{
                        marginTop: "auto",
                        display: "flex",
                        gap: 12,
                        borderTop: "1px solid #eee",
                        padding: 16,
                    }}
                >
                    <Button
                        onClick={onClose}
                        variant="outline"
                        fullWidth
                        size="md"
                    >
                        Cancel
                    </Button>

                    <Button
                        size="md"
                        fullWidth
                        onClick={onSubmit}
                    >
                        Submit
                    </Button>
                </div>
            </div>
        </SideDrawer>
    );
};

export default GeoLocationModal;
