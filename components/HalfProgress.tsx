import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, { 
    useSharedValue, 
    useAnimatedProps, 
    withTiming, 
    withDelay, 
    withSpring,
    Easing
} from "react-native-reanimated";

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Simplified generic color imports; passing via props is safer for dynamic light/dark theming
type Props = {
    progress: number;     // 0 → 1
    size?: number;
    strokeWidth?: number;
    segments?: number;
    gapAngle?: number;
    value?: number;
    label?: string;
    activeColor?: string;
    inactiveColor?: string;
    textColor?: string;
};

export function HalfProgress({
    progress,
    size = 280,
    strokeWidth = 32,
    segments = 15,
    gapAngle = 20,
    value,
    label,
    activeColor = "#21aa45ff",
    inactiveColor = "#E5E7EB",
    textColor = "#000",
}: Props) {
    const clamped = Math.max(0, Math.min(1, progress));

    const radius = (size - strokeWidth) / 2;
    const cx = size / 2;
    const cy = size / 2;

    const totalAngle = 180;
    const totalGap = gapAngle * (segments - 1);
    
    // Slightly reduce angle to avoid edge overlap
    const segmentAngle = (totalAngle - totalGap) / segments - 0.5;

    const polarToCartesian = (angle: number) => {
        const rad = (Math.PI / 180) * angle;
        return {
            x: cx + radius * Math.cos(rad),
            y: cy - radius * Math.sin(rad),
        };
    };

    const createArc = (startAngle: number, endAngle: number) => {
        const start = polarToCartesian(startAngle);
        const end = polarToCartesian(endAngle);

        return `
      M ${start.x} ${start.y}
      A ${radius} ${radius} 0 0 0 ${end.x} ${end.y}
    `;
    };

    // Staggered animation arrays
    const pathAnims = Array.from({ length: segments }).map(() => useSharedValue(0));

    useEffect(() => {
        const activeSegments = Math.round(clamped * segments);
        
        pathAnims.forEach((anim, i) => {
            const isActive = i < activeSegments;
            anim.value = withDelay(
                i * 60, // Stagger effect
                withSpring(isActive ? 1 : 0, { damping: 14, stiffness: 120 })
            );
        });
    }, [clamped, segments]);

    let currentAngle = 180;

    return (
        <View style={{ width: size, height: size / 2, alignItems: 'center', justifyContent: 'flex-end', marginVertical: 16 }}>
            <Svg width={size} height={size / 2 + strokeWidth} style={{ overflow: 'visible' }}>
                {Array.from({ length: segments }).map((_, i) => {
                    const start = currentAngle;
                    const end = currentAngle - segmentAngle;
                    currentAngle = end - gapAngle;

                    const animatedProps = useAnimatedProps(() => {
                        return {
                            strokeOpacity: pathAnims[i].value
                        };
                    });

                    return (
                        <React.Fragment key={i}>
                            {/* Inactive backdrop segment */}
                            <Path
                                d={createArc(start, end)}
                                stroke={inactiveColor}
                                strokeWidth={strokeWidth}
                                fill="none"
                                strokeLinecap="butt"
                            />
                            {/* Active foreground segment that animates strokeWidth from 0 to full for a 3D growth pop */}
                            <AnimatedPath
                                animatedProps={animatedProps}
                                d={createArc(start, end)}
                                stroke={activeColor}
                                strokeWidth={strokeWidth}
                                fill="none"
                                strokeLinecap="butt"
                            />
                        </React.Fragment>
                    );
                })}
            </Svg>

            <View style={[styles.textOverlay, { bottom: -strokeWidth / 2 }]}>
                {/* User's mockup showed a subtle flame logic, which could be an emoji or lucide icon */}
                <Text style={{ fontSize: 24, marginBottom: -4 }}>🔥</Text>
                <Text style={[styles.mainText, { color: textColor }]}>{value}</Text>
                <Text style={styles.subText}>{label}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    textOverlay: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 8,
    },
    mainText: {
        fontSize: 34,
        fontWeight: '800',
    },
    subText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#9CA3AF', // generic gray, overrides lightly if needed
        marginTop: -4,
    }
});
