import {
    useState,
    useEffect,
    useRef,
    useCallback,
    Children,
    cloneElement,
    ReactElement,
    isValidElement
} from "react";

interface CarouselProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    showNavigation?: boolean;
    autoScrollInterval?: number; // default fallback
}

const Carousel = ({
    children,
    className = "",
    style = {},
    showNavigation = true,
    autoScrollInterval = 2000
}: CarouselProps) => {

    const slides = Children.toArray(children).filter(
        (child): child is ReactElement =>
            isValidElement(child) && child.type === CarouselSlide
    );

    const [currentIndex, setCurrentIndex] = useState(1);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const transitionRef = useRef<number | null>(null);
    const autoScrollTimeoutRef = useRef<number | null>(null);

    const extendedSlides = [
        slides[slides.length - 1],
        ...slides,
        slides[0]
    ];

    const goToSlide = (index: number) => {
        setIsTransitioning(true);
        setCurrentIndex(index);
    };

    const next = useCallback(() => {
        if (isTransitioning) return;
        goToSlide(currentIndex + 1);
    }, [isTransitioning, currentIndex]);

    const prev = useCallback(() => {
        if (isTransitioning) return;
        goToSlide(currentIndex - 1);
    }, [isTransitioning, currentIndex]);

    // Handle infinite loop edge jumps
    useEffect(() => {
        if (!isTransitioning) return;

        transitionRef.current = window.setTimeout(() => {
            setIsTransitioning(false);

            if (currentIndex === 0) {
                setCurrentIndex(slides.length);
            } else if (currentIndex === slides.length + 1) {
                setCurrentIndex(1);
            }
        }, 700);

        return () => {
            if (transitionRef.current) {
                clearTimeout(transitionRef.current);
            }
        };
    }, [currentIndex, isTransitioning, slides.length]);

    const getActualIndex = () => {
        if (currentIndex === 0) return slides.length - 1;
        if (currentIndex === slides.length + 1) return 0;
        return currentIndex - 1;
    };

    const getCurrentSlideDelay = () => {
        const actualIndex = getActualIndex();
        const slide = slides[actualIndex];
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return slide?.props.autoScrollDelay ?? autoScrollInterval;
    };

    // Auto-scroll logic (per-slide timing)
    useEffect(() => {
        if (slides.length <= 1) return;
        if (isHovered || isTransitioning) return;

        const delay = getCurrentSlideDelay();

        autoScrollTimeoutRef.current = window.setTimeout(() => {
            next();
        }, delay);

        return () => {
            if (autoScrollTimeoutRef.current) {
                clearTimeout(autoScrollTimeoutRef.current);
            }
        };
    }, [
        currentIndex,
        isHovered,
        isTransitioning,
        slides.length,
        next
    ]);

    const actualIndex = getActualIndex();

    return (
        <div
            className={`relative w-full max-w-full h-full overflow-hidden rounded-none md:rounded-2xl shadow-2xl ${className}`}
            style={style}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                className={`flex w-full min-w-0 ${isTransitioning
                    ? "transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]"
                    : ""
                    }`}
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
                {extendedSlides.map((slide, i) =>
                    cloneElement(slide, { key: i })
                )}
            </div>

            {showNavigation && (
                <button
                    onClick={prev}
                    className="group w-10 h-10 flex items-center justify-center absolute top-1/2 left-4 -translate-y-1/2 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-full shadow-xl transition-all duration-300 hover:scale-110"
                    aria-label="Previous slide"
                >
                    <span className="text-lg font-bold text-white group-hover:-translate-x-0.5 transition-transform">
                        ❮
                    </span>
                </button>
            )}

            {showNavigation && (
                <button
                    onClick={next}
                    className="group w-10 h-10 flex items-center justify-center absolute top-1/2 right-4 -translate-y-1/2 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-full shadow-xl transition-all duration-300 hover:scale-110"
                    aria-label="Next slide"
                >
                    <span className="text-lg font-bold text-white group-hover:translate-x-0.5 transition-transform">
                        ❯
                    </span>
                </button>
            )}

            <div className="absolute bottom-2 left-6 flex items-center gap-2 px-4 py-2 rounded-xl">
                <div className="flex items-center gap-4">
                    {slides.map((_, index) => {
                        const isActive = index === actualIndex;

                        return (
                            <button
                                key={index}
                                onClick={() => goToSlide(index + 1)}
                                className={`relative h-2 rounded-lg transition-all duration-500 ${isActive
                                    ? "bg-white w-6"
                                    : "bg-white/60 w-2 hover:bg-white"
                                    }`}
                                aria-label={`Go to slide ${index + 1}`}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Carousel;



interface CarouselSlideProps {
    children: React.ReactNode;
    autoScrollDelay?: number; // ms
}

export const CarouselSlide = ({ children }: CarouselSlideProps) => {
    return (
        <div
            className="
                flex-shrink-0
                flex-grow-0
                basis-full
                w-full
                h-full
                min-w-0
                overflow-hidden
            "
        >
            {children}
        </div>
    );
};
