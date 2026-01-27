import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFeedback } from '../hooks/useFeedback';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';

export const FeedbackScreen = () => {
    const navigation = useNavigation();
    const { submitFeedback, submitting } = useFeedback();
    const [content, setContent] = useState('');
    const [category, setCategory] = useState<'General' | 'Bug' | 'Feature'>('General');
    const [rating, setRating] = useState(0);

    const categories = [
        { id: 'General', label: 'General', icon: 'chatbox-ellipses-outline' },
        { id: 'Bug', label: 'Bug', icon: 'bug-outline' },
        { id: 'Feature', label: 'Feature', icon: 'bulb-outline' }
    ];

    const handleSubmit = async () => {
        if (!content.trim()) {
            Alert.alert('Missing Info', 'Please describe your feedback.');
            return;
        }
        if (rating === 0) {
            Alert.alert('Missing Info', 'Please provide a rating.');
            return;
        }

        const success = await submitFeedback(`${category}: ${content} \n\nRating: ${rating}/5`);
        if (success) {
            Alert.alert(
                'Thank You!', 
                'We appreciate your feedback. It helps us improve!',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        }
    };

    const renderRatingStar = (star: number) => (
        <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
            <Icon 
                name={rating >= star ? 'star' : 'star-outline'} 
                size={36} 
                color={rating >= star ? '#F59E0B' : '#D1D5DB'} 
                style={{ marginHorizontal: 4 }}
            />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Give Feedback</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                {/* Hero Section */}
                <LinearGradient 
                    colors={[COLORS.primary, '#818cf8']} 
                    style={styles.heroSection}
                    start={{x: 0, y: 0}} end={{x: 1, y: 1}}
                >
                    <Icon name="heart" size={48} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.heroTitle}>We Value Your Opinion</Text>
                    <Text style={styles.heroSubtitle}>
                        Your feedback helps us build a better experience for your organization.
                    </Text>
                </LinearGradient>

                {/* Rating Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>How would you rate your experience?</Text>
                    <View style={styles.ratingContainer}>
                        {[1, 2, 3, 4, 5].map(renderRatingStar)}
                    </View>
                </View>

                {/* Category Selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>What is this regarding?</Text>
                    <View style={styles.categoriesRow}>
                        {categories.map((cat) => (
                            <TouchableOpacity 
                                key={cat.id} 
                                style={[
                                    styles.categoryBadge, 
                                    category === cat.id && styles.categorySelected
                                ]}
                                onPress={() => setCategory(cat.id as any)}
                            >
                                <Icon 
                                    name={cat.icon} 
                                    size={16} 
                                    color={category === cat.id ? '#fff' : COLORS.text.secondary} 
                                />
                                <Text style={[
                                    styles.categoryText, 
                                    category === cat.id && styles.categoryTextSelected
                                ]}>{cat.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Feedback Input */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Tell us more</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Share your thoughts, suggestions, or issues..."
                            placeholderTextColor="#9CA3AF"
                            multiline
                            textAlignVertical="top"
                            value={content}
                            onChangeText={setContent}
                        />
                    </View>
                </View>

            </ScrollView>

            {/* Footer with Submit Button */}
            <View style={styles.footer}>
                <TouchableOpacity 
                    style={[styles.submitBtn, submitting && styles.disabledBtn]} 
                    onPress={handleSubmit}
                    disabled={submitting}
                    activeOpacity={0.8}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Icon name="paper-plane" size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.submitBtnText}>Submit Feedback</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        justifyContent: 'space-between',
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text.primary },
    scrollContent: { paddingBottom: 120 },
    heroSection: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    heroTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginTop: 12 },
    heroSubtitle: { 
        fontSize: 14, 
        color: 'rgba(255,255,255,0.9)', 
        textAlign: 'center', 
        marginTop: 4,
        lineHeight: 20
    },
    section: { marginBottom: 24, paddingHorizontal: 20 },
    sectionTitle: { 
        fontSize: 16, 
        fontWeight: '700', 
        color: COLORS.text.primary, 
        marginBottom: 12 
    },
    ratingContainer: { flexDirection: 'row', justifyContent: 'center' },
    categoriesRow: { flexDirection: 'row', gap: 10 },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 6,
    },
    categorySelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
        elevation: 4,
        shadowColor: COLORS.primary,
        shadowOpacity: 0.3,
        shadowRadius: 4,
        shadowOffset: {width: 0, height: 2}
    },
    categoryText: { fontSize: 14, fontWeight: '500', color: COLORS.text.secondary },
    categoryTextSelected: { color: '#fff', fontWeight: 'bold' },
    inputContainer: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: {width: 0, height: 2}
    },
    input: {
        height: 150,
        padding: 16,
        fontSize: 16,
        lineHeight: 24,
        color: COLORS.text.primary,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        elevation: 10,
    },
    submitBtn: {
        backgroundColor: COLORS.primary,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    disabledBtn: { opacity: 0.7 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
