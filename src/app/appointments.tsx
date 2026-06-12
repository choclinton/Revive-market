import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, View, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { dataService, Appointment } from '@/services/dataService';

export default function AppointmentsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' || !scheme ? 'light' : scheme];
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await dataService.getAllAppointments();
      setAppointments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  };

  const renderAppointment = ({ item }: { item: Appointment }) => {
    const date = new Date(item.appointment_date);
    const dateStr = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let statusColor: string = colors.textSecondary;
    if (item.status === 'scheduled') statusColor = colors.primary;
    if (item.status === 'completed') statusColor = colors.success;
    if (item.status === 'cancelled') statusColor = '#FF3B30';

    return (
      <View style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
        <View style={styles.cardHeader}>
          <View style={styles.dateContainer}>
            <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} />
            <ThemedText type="default" style={{ marginLeft: Spacing.two, fontWeight: '600' }}>
              {dateStr}
            </ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <ThemedText type="small" style={{ color: statusColor, textTransform: 'capitalize', fontWeight: 'bold' }}>
              {item.status}
            </ThemedText>
          </View>
        </View>

        <View style={styles.timeContainer}>
          <MaterialCommunityIcons name="clock-outline" size={16} color={colors.textSecondary} />
          <ThemedText type="small" style={{ color: colors.textSecondary, marginLeft: Spacing.one }}>
            {timeStr}
          </ThemedText>
        </View>
        
        <View style={styles.roomContainer}>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            Room ID: {item.room_id}
          </ThemedText>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { borderBottomColor: colors.backgroundSelected, backgroundColor: colors.backgroundElement }]}>
        <ThemedText type="subtitle">Appointments</ThemedText>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ThemedText style={{ color: '#FF3B30' }}>{error}</ThemedText>
        </View>
      ) : appointments.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="calendar-blank" size={64} color={colors.textSecondary} style={{ opacity: 0.5, marginBottom: Spacing.four }} />
          <ThemedText type="default" style={{ fontWeight: '600' }}>No Appointments</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: Spacing.one }}>
            You haven't scheduled any appointments yet.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          renderItem={renderAppointment}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={loadAppointments}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Spacing.six,
    paddingBottom: Spacing.four,
    paddingHorizontal: Spacing.four,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  list: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  card: {
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 1,
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  roomContainer: {
    marginTop: Spacing.two,
  },
  statusBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.six,
  },
});
