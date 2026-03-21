/**
 * Web fallback for react-native-pager-view (native-only module).
 * Uses a simple horizontal scroll with snap behavior.
 */
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, ScrollView, Dimensions, StyleSheet } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PagerViewProps {
  style?: any;
  initialPage?: number;
  onPageSelected?: (e: { nativeEvent: { position: number } }) => void;
  children: React.ReactNode;
}

const PagerView = forwardRef<any, PagerViewProps>(({ style, initialPage = 0, onPageSelected, children }, ref) => {
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const childrenArray = React.Children.toArray(children);

  useImperativeHandle(ref, () => ({
    setPage: (page: number) => {
      scrollRef.current?.scrollTo({ x: page * SCREEN_WIDTH, animated: true });
      setCurrentPage(page);
    },
    setPageWithoutAnimation: (page: number) => {
      scrollRef.current?.scrollTo({ x: page * SCREEN_WIDTH, animated: false });
      setCurrentPage(page);
    },
  }));

  const handleScroll = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    if (page !== currentPage && page >= 0 && page < childrenArray.length) {
      setCurrentPage(page);
      onPageSelected?.({ nativeEvent: { position: page } });
    }
  };

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={handleScroll}
      contentOffset={{ x: initialPage * SCREEN_WIDTH, y: 0 }}
      style={[{ flex: 1 }, style]}
    >
      {childrenArray.map((child, index) => (
        <View key={index} style={{ width: SCREEN_WIDTH }}>
          {child}
        </View>
      ))}
    </ScrollView>
  );
});

PagerView.displayName = 'PagerView';

export default PagerView;
