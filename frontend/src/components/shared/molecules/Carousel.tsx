import { useState, useEffect, useRef, useCallback, Children, cloneElement, ReactElement, isValidElement } from "react";

interface CarouselSlideProps {
    children: React.ReactNode;
}

export const CarouselSlide = ({ children }: CarouselSlideProps) => {
    return <div className="w-full h-full min-h-full bg-red- min-w-0 overflow-hidden flex-shrink-0">{children}</div>;
};

interface CarouselProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    showNavigation?: boolean;
    autoScrollInterval?: number;
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
    const autoScrollRef = useRef<number | null>(null);
    const transitionRef = useRef<number | null>(null);

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

    // Handle infinite loop transitions
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

    useEffect(() => {
        if (slides.length <= 1) return;

        if (!isHovered && !isTransitioning) {
            autoScrollRef.current = setInterval(() => {
                next();
            }, autoScrollInterval);
        }

        return () => {
            if (autoScrollRef.current) {
                clearInterval(autoScrollRef.current);
            }
        };
    }, [isHovered, isTransitioning, currentIndex, slides.length, autoScrollInterval, next]);

    const getActualIndex = () => {
        if (currentIndex === 0) return slides.length - 1;
        if (currentIndex === slides.length + 1) return 0;
        return currentIndex - 1;
    };

    const actualIndex = getActualIndex();

    return (
        <div
            className={`relative w-full max-w-full h-full overflow-hidden rounded-2xl shadow-2xl ${className}`}
            style={style}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                className={`flex w-full min-w-0 ${isTransitioning ? 'transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]' : ''}`}
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
                {extendedSlides?.map((slide, i) =>
                    cloneElement(slide, { key: i })
                )}
            </div>

            {showNavigation && <button
                onClick={prev}
                className="group w-10 h-10 flex items-center justify-center absolute top-1/2 left-4 -translate-y-1/2 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white-800 rounded-full shadow-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl backdrop-blur-sm"
                aria-label="Previous slide"
            >
                <span className="text-lg font-bold group-hover:-translate-x-0.5 transition-transform text-white">❮</span>
            </button>}

            {showNavigation && <button
                onClick={next}
                className="group w-10 h-10 flex items-center justify-center absolute top-1/2 right-4 -translate-y-1/2 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white-800 rounded-full shadow-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl backdrop-blur-sm"
                aria-label="Next slide"
            >
                <span className="text-lg font-bold group-hover:translate-x-0.5 transition-transform text-white">❯</span>
            </button>}

            <div className="absolute bottom-2 left-6 flex items-center gap-2 px-4 py-2 rounded-xl">
                <div className="relative flex items-center gap-4">
                    {slides?.map((_, index) => {
                        const isActive = index === actualIndex;

                        return (
                            <button
                                key={index}
                                onClick={() => goToSlide(index + 1)}
                                className={`
                        relative h-2 rounded-lg transition-all duration-500 ease-out
                        ${isActive ? "bg-white w-6" : "bg-white/60 w-2 hover:bg-white"}
                    `}
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